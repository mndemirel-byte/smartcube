import React from 'react';
import { COLORS } from '../data/content.js';

export default function MoveChip({ move, active, dim, big }) {
  const c = COLORS[move[0]];
  return (
    <span className={'chip' + (active ? ' chip-on' : '') + (dim ? ' chip-dim' : '') + (big ? ' chip-big' : '')}
      style={{ '--fc': c }}>
      {move.replace("'", '\u2032')}
    </span>
  );
}
