export const TILE_SIZE = 48;
export const MAP_COLS  = 20;
export const MAP_ROWS  = 14;

export const TILE = { FLOOR: 0, WALL: 1, MACHINE: 3 };

// Layout (top-down city view):
//   Row 1-2 : Kali Linux base       (cols 8-11)
//   Row 3   : path below Kali       (cols 8-11)
//   Row 4   : horizontal highway    (cols 3-15)
//   Row 5   : branches              (col 3, cols 8-11, col 15)
//   Row 6-7 : Web(1-4) center(8-11) Mail(15-18)
//   Row 8   : wide approach to DB   (cols 7-12)
//   Row 9-10: DB + bypass cols 7,12 (machine 8-11)
//   Row 11  : firewall zone         (cols 7-12)
//   Row 12-13: Domain Controller    (cols 8-11)
export const NETWORK_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 0  border
  [1,1,1,1,1,1,1,1,3,3,3,3,1,1,1,1,1,1,1,1], // 1  Kali
  [1,1,1,1,1,1,1,1,3,3,3,3,1,1,1,1,1,1,1,1], // 2  Kali
  [1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1], // 3  spawn zone
  [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1], // 4  highway (3-15)
  [1,1,1,0,1,1,1,1,0,0,0,0,1,1,1,0,1,1,1,1], // 5  branches
  [1,3,3,3,3,1,1,1,0,0,0,0,1,1,1,3,3,3,3,1], // 6  Web Mail center
  [1,3,3,3,3,1,1,1,0,0,0,0,1,1,1,3,3,3,3,1], // 7  Web Mail center
  [1,1,1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,1], // 8  wide path (7-12)
  [1,1,1,1,1,1,1,0,3,3,3,3,0,1,1,1,1,1,1,1], // 9  DB + bypass
  [1,1,1,1,1,1,1,0,3,3,3,3,0,1,1,1,1,1,1,1], // 10 DB + bypass
  [1,1,1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,1], // 11 firewall zone (7-12)
  [1,1,1,1,1,1,1,1,3,3,3,3,1,1,1,1,1,1,1,1], // 12 DC
  [1,1,1,1,1,1,1,1,3,3,3,3,1,1,1,1,1,1,1,1], // 13 DC
];

// GHOST spawns just below Kali on the path tile
export const GHOST_SPAWN = { col: 9, row: 3 };

// col/row = top-left tile, w/h in tiles
export const MACHINE_POSITIONS = {
  kali:       { col: 8,  row: 1,  w: 4, h: 2, name: 'Kali Linux',        icon: '💻', ip: '10.0.0.1',     type: 'hub' },
  webserver:  { col: 1,  row: 6,  w: 4, h: 2, name: 'Active Directory',   icon: '🏢', ip: '192.168.1.10',  type: 'server', difficulty: 'easy' },
  mailserver: { col: 15, row: 6,  w: 4, h: 2, name: 'Mail Server',       icon: '📧', ip: '192.168.1.20',  type: 'server', difficulty: 'medium' },
  dbserver:   { col: 8,  row: 9,  w: 4, h: 2, name: 'DB Server',         icon: '🗄',  ip: '192.168.1.30',  type: 'server', difficulty: 'medium' },
  dc:         { col: 8,  row: 12, w: 4, h: 2, name: 'Domain Controller', icon: '👑', ip: '192.168.1.100', type: 'boss',   difficulty: 'hard' },
};

export const CABLE_LINKS = [
  ['kali', 'webserver'],
  ['kali', 'mailserver'],
  ['webserver', 'dbserver'],
  ['mailserver', 'dbserver'],
  ['dbserver', 'dc'],
];
