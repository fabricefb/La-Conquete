import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { ChurchEvent } from '../../types';

export function useEventReminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<any[]>([]);

  // Determine current time slot
  const getCurrentSlot = (): 'matin' | 'apres_midi' | 'soir' | null => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'matin';
    if (hour >= 12 && hour < 18) return 'apres_midi';
    if (hour >= 18 && hour < 23) return 'soir';
    return null;
  };

  useEffect(() => {
    if (!user) return;

    const checkReminders = async () => {
      try {
        const slot = getCurrentSlot();
        if (!slot) return;

        const today = new Date().toISOString().split('T')[0];
        const weekLater = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

        // 1. Get upcoming events in next 7 days
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .gte('event_date', today)
          .lte('event_date', weekLater)
          .order('event_date', { ascending: true });

        if (eventsError) {
          console.error('[useEventReminders] Error fetching events:', eventsError.message);
          return;
        }

        if (!events || events.length === 0) return;

        const eventIds = events.map((e: any) => e.id);

        // 2. Check which reminders are configured
        const { data: configuredReminders, error: remindersError } = await supabase
          .from('event_reminders')
          .select('*')
          .in('event_id', eventIds)
          .eq('reminder_time', slot)
          .eq('is_active', true);

        if (remindersError) {
          console.error('[useEventReminders] Error fetching event_reminders:', remindersError.message);
          return;
        }

        if (!configuredReminders || configuredReminders.length === 0) return;

        // 3. For each configured reminder, check if notification already exists
        for (const reminder of configuredReminders) {
          try {
            const matchedEvent = events.find((e: any) => e.id === reminder.event_id);
            const notifTitle = `Rappel: ${matchedEvent?.title || 'Événement'}`;

            const { data: existingNotif, error: notifCheckError } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', user!.id)
              .eq('ref_table', 'events')
              .eq('ref_id', reminder.event_id)
              .eq('title', notifTitle)
              .limit(1);

            if (notifCheckError) {
              console.error('[useEventReminders] Error checking existing notification:', notifCheckError.message);
              continue;
            }

            if (existingNotif && existingNotif.length > 0) continue;

            // 4. Create notification
            const event = matchedEvent;
            if (!event) continue;

            const template =
              reminder.message_template ||
              `${event.title} a lieu le ${new Date(event.event_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}. Préparez-vous !`;

            const { error: insertError } = await supabase.from('notifications').insert({
              user_id: user!.id,
              type: 'general',
              title: `Rappel: ${event.title}`,
              body: template,
              link: null,
              ref_table: 'events',
              ref_id: event.id,
              is_read: false,
            });

            if (insertError) {
              console.error('[useEventReminders] Error inserting notification:', insertError.message);
            }
          } catch (innerErr) {
            console.error('[useEventReminders] Error processing reminder:', innerErr);
          }
        }

        setReminders(configuredReminders);
      } catch (err) {
        console.error('[useEventReminders] Error in checkReminders:', err);
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 30 * 60 * 1000); // every 30 min

    return () => clearInterval(interval);
  }, [user]);

  return { upcomingReminders: reminders };
}