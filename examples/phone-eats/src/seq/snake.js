// 1997：镜头推进手机屏幕，屏幕变成绿色液晶，贪吃蛇一路向上，把一台像素掌机吃掉

const SPRITE = ['111111', '100001', '101101', '100001', '111111', '101011', '111111', '110101', '111111'];

export class Snake {
  constructor(ctx, t0) {
    this.t0 = t0;
    this.cell = 60;
    this.cols = 16;
    this.rows = 32;
    this.ox = 60;
    this.oy = 330;
    this.food = [];
    SPRITE.forEach((row, y) => [...row].forEach((v, x) => v === '1' && this.food.push([5 + x, 12 + y])));
    const way = [
      [1, 29],
      [8, 29],
      [8, 6],
      [13, 6],
      [13, 2],
    ];
    this.cells = [way[0]];
    for (let i = 1; i < way.length; i++) {
      let [x, y] = this.cells[this.cells.length - 1];
      const [tx, ty] = way[i];
      while (x !== tx || y !== ty) {
        x += Math.sign(tx - x);
        y += Math.sign(ty - y);
        this.cells.push([x, y]);
      }
    }
    this.speed = 14;
    this.len0 = 7;
    this.start = t0 + 0.6;
    this.on = [t0 + 0.45, t0 + 3.7];
    this.eatStart = this.start + 16 / this.speed;
    this.eatEnd = this.start + 24 / this.speed;
    ctx.tl.item(this.eatEnd, 'game', '掌机');
    ctx.tl.event(this.on[0], 'snake', { dur: this.on[1] - this.on[0] });
    ctx.tl.event(this.eatStart, 'chomp', { dur: this.eatEnd - this.eatStart });
  }

  active(t) {
    return t >= this.on[0] && t < this.on[1];
  }

  state(t) {
    const d = Math.max(0, (t - this.start) * this.speed);
    const head = Math.min(this.cells.length - 1, Math.floor(d));
    const [hx, hy] = this.cells[head];
    let food = this.food;
    let eaten = 0;
    if (hx === 8 && hy <= 20 && head >= 16) food = this.food.filter(([, y]) => y < hy);
    if (head >= 24) food = [];
    eaten = this.food.length - food.length;
    const len = this.len0 + Math.round(eaten * 0.6);
    const body = this.cells.slice(Math.max(0, head - len + 1), head + 1);
    return {
      cell: this.cell,
      cols: this.cols,
      rows: this.rows,
      ox: this.ox,
      oy: this.oy,
      score: eaten,
      body,
      food,
      foodOn: true,
    };
  }
}
