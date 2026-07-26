import { useEffect } from 'react';
import router from 'next/router';

/** Legacy RH lobby URL — same experience as `/` on Robinhood (aarena-only landing). */
const CombatRhRedirect = () => {
  useEffect(() => {
    void router.replace('/');
  }, []);
  return null;
};

export default CombatRhRedirect;
