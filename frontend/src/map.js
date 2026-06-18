export const TILE_SIZE = 48;
export const MAP_COLS  = 20;
export const MAP_ROWS  = 16;

export const TILE = { FLOOR: 0, WALL: 1, MACHINE: 3 };

// Layout (top-down city view):
//   Row 1-2 : Kali Linux base           (cols 8-11)
//   Row 3   : path below Kali           (cols 8-11)
//   Row 9-10: AI_CORE(8-11)
//   Row 11  : border
export const NETWORK_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 0  border
  [1,1,1,1,1,1,1,1,3,3,3,3,1,1,1,1,1,1,1,1], // 1  Kali
  [1,1,1,1,1,1,1,1,3,3,3,3,1,1,1,1,1,1,1,1], // 2  Kali
  [1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1], // 3  spawn zone
  [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1], // 4  highway (3-15)
  [1,1,1,0,1,1,1,1,0,0,0,0,1,1,1,0,1,1,1,1], // 5  branches
  [1,3,3,3,3,1,1,1,0,0,0,0,1,1,1,3,3,3,3,1], // 6  Web Mail center
  [1,3,3,3,3,1,1,1,0,0,0,0,1,1,1,3,3,3,3,1], // 7  Web Mail center
  [1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1], // 8  wide path (7-14)
  [1,1,1,1,1,1,1,1,3,3,3,3,1,1,1,1,1,1,1,1], // 9  AI_CORE
  [1,1,1,1,1,1,1,1,3,3,3,3,1,1,1,1,1,1,1,1], // 10 AI_CORE
  [1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1], // 11 path to mainframe
  [1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1], // 12 path to mainframe
  [1,1,1,1,1,1,1,1,3,3,3,3,1,1,1,1,1,1,1,1], // 13 MAINFRAME
  [1,1,1,1,1,1,1,1,3,3,3,3,1,1,1,1,1,1,1,1], // 14 MAINFRAME
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 15 border
];

// GHOST spawns just below Kali on the path tile
export const GHOST_SPAWN = { col: 9, row: 3 };

// col/row = top-left tile, w/h in tiles
export const MACHINE_POSITIONS = {
  kali:       { col: 8,  row: 1,  w: 4, h: 2, name: 'Kali Linux',        icon: '💻', ip: '10.0.0.1',     type: 'hub' },
  webserver:  { col: 1,  row: 6,  w: 4, h: 2, name: 'Active Directory',   icon: '🏢', ip: '192.168.1.10',  type: 'server', difficulty: 'easy' },
  mailserver: { col: 15, row: 6,  w: 4, h: 2, name: 'Web Application',    icon: '🌐', ip: '192.168.1.20',  type: 'server', difficulty: 'medium' },
  aicore:     { col: 8,  row: 9,  w: 4, h: 2, name: 'AI_CORE',           icon: '🧠', ip: '10.0.0.99',     type: 'server', difficulty: 'hard' },
  mainframe:  { col: 8,  row: 13, w: 4, h: 2, name: 'NEXUS MAINFRAME',   icon: '💀', ip: '10.0.0.0',      type: 'server', difficulty: 'extreme' },
};

export const CABLE_LINKS = [
  ['kali', 'webserver'],
  ['kali', 'mailserver'],
  ['webserver', 'aicore'],
  ['mailserver', 'aicore'],
];
