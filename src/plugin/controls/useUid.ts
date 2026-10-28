import { useState } from 'react';

let counter = 0;

// An id that stays the same while a component lives and differs between instances, for the
// htmlFor and list attributes. React 18 has a hook for this, but Superset 6.1.0 runs React 17.
export const useUid = (prefix = 'hct'): string => {
  const [uid] = useState(() => {
    counter += 1;
    return `${prefix}-${counter}`;
  });
  return uid;
};
