// Phần thưởng Brutal và mùa (phía client): vệt độc quyền khi thắng Brutal lần đầu, thưởng mùa mỗi mùa nhận một lần, công thức điểm mùa.
import * as PR from '../profile.js';
import { seasonPoints, brutalOk } from '../seasonui.js';
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };

PR.P.trails = []; PR.P.seasons = {}; PR.P.badges = []; PR.P.gems = 0; PR.P.stats.wins = 5;
const r = PR.runEnded(25, true, 'MAGE', 'HARD');
ok(r.bonus.some(b => b[0] === 'Brutal victory' && b[1] === PR.ECON.hardWin) && r.unlocks.some(u => u.id === 'brutal') && PR.P.trails.includes('brutal'), 'first Brutal victory gives the bonus and the exclusive Brutal Ember trail');
const t = PR.TRAILS.find(x => x.id === 'brutal'); ok(t && t.exclusive && t.aura, 'Brutal Ember is exclusive and has an aura');
const r2 = PR.runEnded(25, true, 'MAGE', 'HARD'); ok(!r2.unlocks.some(u => u.id === 'brutal'), 'the trail is only granted once');

const g0 = PR.P.gems, got = PR.claimSeason(3, 1);
ok(got && got.trail && got.trail.id === 'champion' && PR.P.gems - g0 === got.gems && PR.P.badges.includes('S3'), 'season #1 gets the Champion trail, gems and badge');
ok(PR.claimSeason(3, 1) === null, 'a season reward is claimed only once');
const s2 = PR.claimSeason(4, 2), s3 = PR.claimSeason(5, 3), s7 = PR.claimSeason(6, 7), s40 = PR.claimSeason(7, 40);
ok(s2.trail.id === 'silver' && s3.trail.id === 'bronze' && !s7.trail && s7.gems > 0 && s40 === null, 'ranks 2, 3, top 10 and outside the top 10 get the right rewards');
ok(PR.SEASON_REWARDS[0].gems > PR.SEASON_REWARDS[1].gems && PR.SEASON_REWARDS[1].gems > PR.SEASON_REWARDS[2].gems, 'season rewards are ordered by rank');

ok(seasonPoints(12, false, 900) === 120 && seasonPoints(25, true, 1800) === 250 + 150 + 60 && seasonPoints(25, true, 99999) === 400, 'season points: stage × 10, victory +150, speed bonus that never goes negative');
ok(brutalOk() === false, 'Brutal is locked until the account has early access');

if (fail) { console.log(fail + ' failed'); process.exit(1); } else console.log('all passed');
