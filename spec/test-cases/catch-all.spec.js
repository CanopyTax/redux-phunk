import { asyncValue } from '../../src/redux-phunk.js';
import { Observable } from 'rx';

describe(`catch-all objects`, () => {
	it(`calls catchAll functions if an error occurs within a phunk`, (done) => {
		let catchAllCalled = false;

		store.dispatch([
			{type: '1'},
			{
				name: "phunk1",
				async phunk() {
					throw new Error("phunk threw an error");
				},
			},
			{
				async catchAll() {
					catchAllCalled = true;
				},
			},
		])
		.then(() => {
			fail("phunkuence should have thrown error");
			done();
		})
		.catch(() => {
			expect(catchAllCalled).toBe(true);
			done();
		});
	});

	it(`doesn't call catchAll functions if an error doesn't occur`, (done) => {
		let catchAllCalled = false;

		store.dispatch([
			{type: '1'},
			{
				name: "phunk1",
				async phunk() {
					return 1
				},
			},
			{
				async catchAll() {
					catchAllCalled = true;
				},
			},
		])
		.then(() => {
			expect(catchAllCalled).toBe(false);
			done();
		})
		.catch(err => {
			fail(err);
			done();
		});
	});

	it(`throws the error from inside of the catchAll if one is thrown`, (done) => {
		store.dispatch([
			{type: '1'},
			{
				name: "phunk1",
				async phunk() {
					throw new Error("phunk threw an error");
				},
			},
			{
				async catchAll() {
					throw new Error("catch all threw an error");
				},
			},
		])
		.then(() => {
			fail("phunkuence should have thrown error");
			done();
		})
		.catch(err => {
			expect(err.message).toEqual("catch all threw an error");
			done();
		});
	});

	it(`throws an error if the catchAll is not at the beginning`, (done) => {
		store.dispatch([
			{
				async catchAll() {
					throw new Error("catch all threw an error");
				},
			},
			{type: '1'},
			{
				name: "phunk1",
				async phunk() {
					throw new Error("phunk threw an error");
				},
			},
		])
		.then(() => {
			fail("phunkuence should have thrown error");
			done();
		})
		.catch(err => {
			done();
		});
	});

	it(`throws an error if catchAll is not a function`, (done) => {
		store.dispatch([
			{type: '1'},
			{
				name: "phunk1",
				async phunk() {
					throw new Error("phunk threw an error");
				},
			},
			{
				catchAll: "not a function",
			},
		])
		.then(() => {
			fail("phunkuence should have thrown error");
			done();
		})
		.catch(err => {
			done();
		});
	});

	it(`throws an error if catchAll doesn't return a promise or observable`, (done) => {
		store.dispatch([
			{type: '1'},
			{
				name: "phunk1",
				async phunk() {
					throw new Error("phunk threw an error");
				},
			},
			{
				catchAll() {
					return "not-a-promise-or-observable";
				}
			},
		])
		.then(() => {
			fail("phunkuence should have thrown error");
			done();
		})
		.catch(err => {
			done();
		});
	});

	it(`is fine if the catchAll returns an observable`, () => {
		let catchAllCalled = false;
		store.dispatch([
			{type: '1'},
			{
				name: "phunk1",
				async phunk() {
					throw new Error("phunk threw an error");
				},
			},
			{
				catchAll() {
					return Observable.create(observer => {
						catchAllCalled = true;
						observer.onNext("catch all!");
					});
				}
			},
		])
		.then(() => {
			fail("phunkuence should have thrown error");
			done();
		})
		.catch(err => {
			expect(catchAllCalled).toBe(true);
			done();
		});
	});
});
