import './testing.scss';

import { Vec } from "./vec";
import { Bezier } from "./fit_curve";
import { Rect } from './rect';
import { project } from './projection';
import { Iter } from './iter';

export async function testUsing(
	el: HTMLElement,
	url: string,
	fn: (pts: Vec[], error: number) => Bezier[],
): Promise<any> {
	const { fit: data } = await fetch(url)
		.then((res) => res.json()) as { fit: RawTest[] };

	const runs = data.map((test, i) => {
		const div = document.createElement('div');
		div.classList.add('test');
		el.appendChild(div);
		return TestRun.from(
			div,
			i,
			testFromRaw(test),
			fn
		);
	});

	return runTests(runs, 3);
}

function testFromRaw(raw: RawTest): Test {
	const { args, returns } = raw,
		[pts, error] = args;
	return {
		args: [
			pts.map(([i, j]) => Vec.of(i, j)),
			error,
		],
		returns: returns.map(
			([a, ca, cb, b]) => [
				Vec.of(a[0], a[1]),
				Vec.of(ca[0], ca[1]),
				Vec.of(cb[0], cb[1]),
				Vec.of(b[0], b[1])
			]
		),
	};
}

type Point = [number, number];
type Spline = [Point, Point, Point, Point][];
interface RawTest {
	args: [Point[], number];
	returns: Spline;
}

export interface Test {
	args: [Vec[], number];
	returns: Bezier[];
}

function pathFromSpline(
	ctx: CanvasRenderingContext2D,
	spline: Iterable<Bezier>,
) {
	ctx.beginPath();
	const iter = spline[Symbol.iterator](),
		{ value, done } = iter.next();
	if (done) {
		return;
	}

	const [a, ca, cb, b] = value;
	ctx.moveTo(a.i, a.j);
	ctx.bezierCurveTo(ca.i, ca.j, cb.i, cb.j, b.i, b.j);
	while (true) {
		const { value, done } = iter.next();
		if (done) {
			break;
		}
		const [a, ca, cb, b] = value;
		ctx.bezierCurveTo(ca.i, ca.j, cb.i, cb.j, b.i, b.j);
	}
}

function examine<T>(
	fn: () => T,
): { result: T | null, time: number, error: Error | null } {
	const start = performance.now();
	try {
		const result = fn();
		return {
			result: result,
			time: performance.now() - start,
			error: null,
		};
	} catch (e: any) {
		return {
			result: null,
			time: performance.now() - start,
			error: e,
		};
	}
}

function vecsAreSame(
	a: Vec,
	b: Vec,
	episilon: number,
): boolean {
	const d = Vec.sub(a, b).abs();
	return d.i < episilon && d.j < episilon;
}

class TestResult {
	private issues: string[] = [];

	constructor(
		public readonly test: Test,
		public readonly result: Bezier[] | null,
		public readonly time: number,
		public readonly error: Error | null,
	) {
		if (result !== null) {
			this.issues = TestResult.compare(result, test.returns);
		}
	}

	get passed(): boolean {
		const { issues, error } = this;
		return issues.length === 0 && error === null;
	}

	get errored(): boolean {
		return this.error !== null;
	}

	private static compare(
		result: Bezier[],
		expected: Bezier[],
		episilon = 0.0001,
	): string[] {
		if (result.length !== expected.length) {
			return [
				`Expected spline of length ${expected.length}, but got ${result.length}`
			];
		}

		const issues = [];
		for (let i = 0, n = result.length; i < n; i++) {
			const [ra, rca, rcb, rb] = result[i],
				[ea, eca, ecb, eb] = expected[i];
			if (vecsAreSame(ra, ea, episilon) &&
				vecsAreSame(rca, eca, episilon) &&
				vecsAreSame(rcb, ecb, episilon) &&
				vecsAreSame(rb, eb, episilon)) {
				continue;
			}

			issues.push(
				`Expected ${i}th spline to be [${ea.i}, ${ea.j}], [${eca.i}, ${eca.j}], [${ecb.i}, ${ecb.j}], [${eb.i}, ${eb.j}], but got [${ra.i}, ${ra.j}], [${rca.i}, ${rca.j}], [${rcb.i}, ${rcb.j}], [${rb.i}, ${rb.j}]`
			);
		}
		return issues;
	}
}

class TestRun {
	constructor(
		private readonly canvas: HTMLCanvasElement,
		private readonly info: HTMLDivElement,
		public readonly index: number,
		public readonly test: Test,
		private readonly fn: (pts: Vec[], error: number) => Bezier[],
	) {
	}

	private updateInfo(result: TestResult) {
		const { info } = this,
			{ time, passed, errored } = result,
			ok = document.createElement('span'),
			ts = document.createElement('span');

		ok.classList.add('ok');
		ts.classList.add('ts');

		ts.textContent = `${time.toFixed(2)}ms`;

		if (errored || !passed) {
			ok.classList.add('fail');
			ok.textContent = '×';
		} else {
			ok.classList.add('pass');
			ok.textContent = '✓';
		}

		info.appendChild(ts);
		info.appendChild(ok);
	}

	run(): TestResult {
		const { canvas, test, fn } = this,
			[pts, error] = test.args,
			{ width, height } = canvas,
			ctx = canvas.getContext('2d')!,
			domain = Rect.boundsOf(pts),
			{ result: spline, time, error: err } = examine(() => fn(pts, error)),
			result = new TestResult(test, spline, time, err);

		this.updateInfo(result);

		if (pts.length < 2 || spline === null) {
			return result;
		}

		const vw = width * 0.8,
			vh = height * 0.8,
			ow = (width - vw) / 2,
			oh = (height - vh) / 2,
			range = Rect.fromXYWH(ow, oh, vw, vh),
			tx = project(domain, range);


		ctx.save();
		pathFromSpline(ctx, Iter.of(spline).map(
			([a, ca, cb, b]) => [tx(a), tx(ca), tx(cb), tx(b)]
		));
		ctx.strokeStyle = '#09f';
		ctx.stroke();
		ctx.restore();

		ctx.save();
		for (const pt of pts) {
			const { i, j } = tx(pt);
			ctx.beginPath();
			ctx.ellipse(i, j, 5, 5, 0, 0, Math.PI * 2);

			ctx.fillStyle = '#fff';
			ctx.fill();
			ctx.lineWidth = 1;
			ctx.strokeStyle = '#09f';
			ctx.stroke();

			ctx.beginPath();
			ctx.ellipse(i, j, 2, 2, 0, 0, Math.PI * 2);
			ctx.fillStyle = '#09f';
			ctx.fill();
		}
		ctx.restore();

		return result;
	}

	static from(
		el: HTMLElement,
		index: number,
		test: Test,
		fn: (pts: Vec[], error: number) => Bezier[],
	): TestRun {
		const canvas = document.createElement('canvas'),
			rect = el.getBoundingClientRect(),
			info = document.createElement('div');

		canvas.width = rect.width;
		canvas.height = rect.height;

		info.classList.add('info');

		el.appendChild(canvas);
		el.appendChild(info);

		return new TestRun(
			canvas,
			info,
			index,
			test,
			fn
		);
	}
}

function runTests(
	tests: TestRun[],
	n: number,
): Promise<TestResult[]> {
	return new Promise((resolve) => {
		const results: TestResult[] = [];
		const iter = chunk(tests, n),
			timer = setInterval(() => {
				const { value, done } = iter.next();
				if (done) {
					clearInterval(timer);
					resolve(results);
					return;
				}

				for (const test of value) {
					results.push(test.run());
				}
			}, 0);

	});
}

function* chunk<T>(
	iter: Iterable<T>,
	n: number,
): Generator<T[]> {
	const buf: T[] = [];

	for (const item of iter) {
		buf.push(item);
		if (buf.length === n) {
			yield buf;
			buf.length = 0;
		}
	}

	if (buf.length > 0) {
		yield buf;
	}
}