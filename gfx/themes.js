// 4 vùng, mỗi vùng 5 stage, khớp với 4 boss. Mỗi vùng: bảng màu nền, vật cản, ánh sáng, hạt trôi.
export const THEMES = {
  forest: {
    name: 'Ruined Forest', bg: '#2c4f28',
    amb: 0.26, dark: '#0b1626',
    base: ['#3f6f37', '#43743a', '#3b6934'], baseD: '#2d5429', baseL: '#5b9145', flowers: ['#f2e27a', '#f29ab0', '#ffffff', '#9fd0ff'],
    patch: ['#365f30', '#33592d'], patchD: '#264620',
    path: ['#7a5a39', '#7f5e3c'], pathD: '#5c4328', pathL: '#9a7650', pebble: '#8d8a80',
    tuft: ['#4f8a3e', '#6aa84c', '#355f2e'], tuftN: 34, dust: '#a89470', motes: 'pollen',
    lamp: '#ffd27a', crateKind: 'wood'
  },
  frost: {
    name: 'Frozen Pass', bg: '#cfdce6',
    amb: 0.2, dark: '#141e3c',
    base: ['#dde7ee', '#d5e0e9', '#e3ecf2'], baseD: '#b4c5d4', baseL: '#ffffff', flowers: ['#9fd0ff', '#ffffff'],
    patch: ['#a6d0e6', '#9ecae2'], patchD: '#78acc9',
    path: ['#b6c4d1', '#b0bfcc'], pathD: '#8fa2b3', pathL: '#cbd7e1', pebble: '#7f93a6',
    tuft: ['#8a7a5a', '#a89470', '#6a5c44'], tuftN: 8, dust: '#f2f7fb', motes: 'snow',
    lamp: '#ffc874', crateKind: 'wood'
  },
  dungeon: {
    name: 'Fungal Caverns', bg: '#262830',
    amb: 0.6, dark: '#07060f',
    base: ['#3b3e4a', '#373a46', '#41444f'], baseD: '#23242d', baseL: '#4e5260', flowers: ['#d8d0c0'],
    patch: ['#38433c', '#344037'], patchD: '#24302a',
    path: ['#30323c', '#2c2e37'], pathD: '#1e1f27', pathL: '#3f4250', pebble: '#55586a',
    tuft: ['#4d6b44', '#3f5a3a', '#5e7d4f'], tuftN: 6, dust: '#8a8c98', motes: 'dust',
    lamp: '#ff9a3c', crateKind: 'barrel'
  },
  palace: {
    name: 'Crimson Palace', bg: '#5a3a26',
    amb: 0.44, dark: '#1a0906',
    base: ['#6e4a30', '#684529', '#734e33'], baseD: '#462c1a', baseL: '#87603f', flowers: ['#e8c070'],
    patch: ['#8a8376', '#847d70'], patchD: '#5e584e',
    path: ['#8e2b2b', '#892828'], pathD: '#5e1616', pathL: '#a83a36', pebble: '#d8b04a',
    tuft: ['#4f7a3e', '#6a9a4c', '#3a5f2e'], tuftN: 0, dust: '#c9a27a', motes: 'petals',
    lamp: '#ff6a4a', crateKind: 'chest'
  }
};
THEMES.volcano = {
  name: 'Ashen Volcano', bg: '#241a1a',
  amb: 0.5, dark: '#1a0604',
  base: ['#2e2426', '#2a2022', '#332829'], baseD: '#1a1314', baseL: '#45383a', flowers: ['#ff7a3c'],
  patch: ['#c8380e', '#b8300c'], patchD: '#7a1a06',
  path: ['#4a3e3a', '#463a36'], pathD: '#2e2624', pathL: '#5e504a', pebble: '#6a5a54',
  tuft: ['#3a2a20', '#4a3426', '#2a1e16'], tuftN: 4, dust: '#6a5a54', motes: 'ash',
  lamp: '#ff8a3c', crateKind: 'iron'
};
export { THEME_ORDER } from '../env.js';
import { THEME_ORDER } from '../env.js';
export function themeOf(sim) { return sim.theme || (sim.stage ? THEME_ORDER[Math.min(4, Math.floor((sim.stage - 1) / 5))] : 'forest'); }
