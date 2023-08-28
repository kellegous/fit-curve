import './style.scss'

import { Bezier, fit } from './fit_curve';
import { Vec } from './vec';
import { testUsing } from './testing';

declare function fitCurve(points: Point[], error: number): Spline;

namespace soswow {

  export function fit(pts: Vec[], error: number): Bezier[] {
    return fitCurve(
      pts.map(({ i, j }) => [i, j]),
      error
    ).map(
      ([a, ca, cb, b]) => [Vec.of(a[0], a[1]), Vec.of(ca[0], ca[1]), Vec.of(cb[0], cb[1]), Vec.of(b[0], b[1])]
    );
  }

}

type Point = [number, number];
type Spline = [Point, Point, Point, Point][];

// interface StrokedSpline {
//   spline: Spline;
//   stroke: string;
// }

// function render(
//   ctx: CanvasRenderingContext2D,
//   pts: Vec[],
//   ...splines: { spline: Bezier[], stroke: string }[]
// ) {
//   if (points.length == 0) {
//     return;
//   }

//   ctx.save();
//   ctx.strokeStyle = '#999';
//   ctx.setLineDash([1, 4]);
//   ctx.lineWidth = 2;
//   ctx.beginPath();
//   const { i, j } = pts[0];
//   ctx.moveTo(i, j);
//   for (let k = 1; k < pts.length; k++) {
//     const { i, j } = pts[k];
//     ctx.lineTo(i, j);
//   }
//   ctx.stroke();
//   ctx.restore();

//   ctx.save();
//   ctx.lineWidth = 2;
//   for (const { spline, stroke } of splines) {
//     if (spline.length === 0) {
//       continue;
//     }

//     ctx.strokeStyle = stroke;
//     ctx.beginPath();
//     const [a, ca, cb, b] = spline[0];
//     ctx.moveTo(a.i, a.j);
//     for (const [a, ca, cb, b] of spline) {
//       ctx.bezierCurveTo(ca.i, ca.j, cb.i, cb.j, b.i, b.j)
//     }
//     ctx.stroke();
//   }
//   ctx.restore();
// }

// function render(
//   ctx: CanvasRenderingContext2D,
//   points: Point[],
//   ...splines: StrokedSpline[]
// ) {
//   if (points.length === 0) {
//     return;
//   }

//   ctx.save();
//   ctx.strokeStyle = '#999';
//   ctx.setLineDash([1, 4]);
//   ctx.lineWidth = 2;
//   ctx.beginPath();
//   const [x, y] = points[0];
//   ctx.moveTo(x, y);
//   for (let i = 1; i < points.length; i++) {
//     const [x, y] = points[i];
//     ctx.lineTo(x, y);
//   }
//   ctx.stroke();
//   ctx.restore();

//   ctx.save();
//   ctx.lineWidth = 2;
//   for (const { spline, stroke } of splines) {
//     if (spline.length === 0) {
//       continue;
//     }

//     ctx.strokeStyle = stroke;
//     ctx.beginPath();
//     const [a, ca, cb, b] = spline[0];
//     ctx.moveTo(a[0], a[1]);
//     for (const [a, ca, cb, b] of spline) {
//       ctx.bezierCurveTo(ca[0], ca[1], cb[0], cb[1], b[0], b[1]);
//     }
//     ctx.stroke();
//   }
//   ctx.restore();
// }

async function main() {
  const v = await testUsing(
    document.querySelector('#tests') as HTMLElement,
    './tests.json',
    soswow.fit
  );
  console.log(v);
}

// const app = document.querySelector<HTMLDivElement>('#app')!,
//   width = 900,
//   height = width * 3 / 4,
//   canvas = document.createElement('canvas'),
//   ctx = canvas.getContext('2d')!;

// canvas.width = width;
// canvas.height = height;
// app.appendChild(canvas);


// const points: Vec[] = JSON.parse(
//   "[[0,309.7556902618977],[40,176.45344165626932],[80,314.5968009958886],[120,112.48834840546031],[160,67.49576444716027],[200,119.9234419985278],[240,226.26109109093642],[280,352.9617429785563],[320,113.92491646063917],[360,251.3187564089967],[400,252.23195014788232],[440,248.43241311259504],[480,174.45653511639279],[520,237.0719266720463],[560,217.11999826755715],[600,335.55267280629664],[640,297.61133906780407],[680,121.2628703409095],[720,102.2635553566112],[760,221.46800546072896],[800,138.68468971106537]]"
// ).map(
//   ([x, y]: [number, number]) => Vec.of(x * width / 800, y * height / 400)
// );

// render(
//   ctx,
//   points,
//   { spline: soswow.fit(points, 100), stroke: 'rgba(0, 0, 0, 0.4)' },
//   { spline: fit(points, 100), stroke: 'rgba(255, 0, 0, 0.2)' },
// );

// console.log(fit(points, 100));

main();

