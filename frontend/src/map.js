export const TILE_SIZE = 48;
export const MAP_COLS  = 20;
export const MAP_ROWS  = 14;

export const TILE = { FLOOR: 0, WALL: 1, MACHINE: 3 };

// 0 = floor  1 = wall  3 = machine (blocking + interactive)
export const NETWORK_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,1],  // Kali (cols 6-8)
  [1,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,3,3,3,0,0,0,0,0,0,0,3,3,3,0,0,0,0,1],  // Web (1-3)  Mail (12-14)
  [1,0,3,3,3,0,0,0,0,0,0,0,3,3,3,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,1],  // DB (6-8)
  [1,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,1],  // DC (6-8)
  [1,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

export const GHOST_SPAWN = { col: 7, row: 4 };

// col/row = top-left tile of the machine block, w/h in tiles
export const MACHINE_POSITIONS = {
  kali:       { col: 6,  row: 2,  w: 3, h: 2, name: 'Kali Linux',        icon: '💻', ip: '10.0.0.1',     type: 'hub' },
  webserver:  { col: 1,  row: 5,  w: 3, h: 2, name: 'Web Server',        icon: '🌐', ip: '192.168.1.10',  type: 'server', difficulty: 'easy' },
  mailserver: { col: 12, row: 5,  w: 3, h: 2, name: 'Mail Server',       icon: '📧', ip: '192.168.1.20',  type: 'server', difficulty: 'medium' },
  dbserver:   { col: 6,  row: 8,  w: 3, h: 2, name: 'DB Server',         icon: '🗄', ip: '192.168.1.30',  type: 'server', difficulty: 'medium' },
  dc:         { col: 6,  row: 11, w: 3, h: 2, name: 'Domain Controller', icon: '👑', ip: '192.168.1.100', type: 'boss',   difficulty: 'hard' },
};

// Cable topology: network connections between machines
export const CABLE_LINKS = [
  ['kali', 'webserver'],
  ['kali', 'mailserver'],
  ['webserver', 'dbserver'],
  ['mailserver', 'dbserver'],
  ['dbserver', 'dc'],
];
