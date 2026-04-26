import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { User } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier la session actuelle
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        setRole(profile?.role || 'employee');
      }
      setLoading(false);
    };

    getSession();

    // Écouter les changements d'état
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null);
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        setRole(profile?.role || 'employee');
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = role === 'admin';

  return { user, role, isAdmin, loading };
};
