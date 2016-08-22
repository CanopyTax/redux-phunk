import { asyncValue } from '../../src/redux-phunk.js';
import { Observable } from 'rx';

describe(`dispatching phunks`, () => {
	it(`throws if you try to dispatch just a lone phunk`, () => {
		/* Dispatching a lone phunk doesn't make sense because nothing
		 * is actually dispatched, it's just executing code. If someone just
		 * wants to execute arbitrary code with no dispatches, they should probably
		 * do it outside of redux-land.
		 */

		let phunkCalled = false;

		expect(() => {
			store.dispatch({phunk() {phunkCalled = true}});
		}).toThrow();
		expect(phunkCalled).toBe(false);
	});

	it(`is fine with the phunk being a function that returns a promise`, (done) => {
		store.dispatch([
			{
				name: 'phunk1',
				async phunk() {
					return 'value1';
				},
			},
			{
				type: "USES_PHUNK_VALUE",
				value: asyncValue("phunk1"),
			},
		])
		.then(values => {
			expect(store.getActions()).toEqual([{type: 'USES_PHUNK_VALUE', value: 'value1'}]);
			done();
		})
		.catch(err => {
			fail(err);
			done();
		});
	});

	it(`is fine with the phunk being a function that returns an observable`, (done) => {
		store.dispatch([
			{
				name: 'phunk1',
				phunk() {
					return Observable.create(observer => {
						observer.onNext("hello");
					});
				},
			},
			{
				type: "USES_PHUNK_VALUE",
				value: asyncValue("phunk1"),
			},
		])
		.then(values => {
			expect(store.getActions()).toEqual([{type: 'USES_PHUNK_VALUE', value: 'hello'}]);
			done();
		})
		.catch(err => {
			fail(err);
			done();
		});
	});

	it(`throws an Error and halts execution of the phunkuence if you reference a non-existent asyncValue`, (done) => {
		store.dispatch([
			{type: 'STEP 1'},
			{
				name: "value1",
				async phunk() {
					return 1.02;
				}
			},
			{type: 'STEP 2', value: asyncValue("valuetypo")},
		])
		.then(() => {
			fail("this phunkuence should have failed");
			done();
		})
		.catch(err => {
			// expected
			expect(store.getActions()).toEqual([{type: 'STEP 1'}]);
			done();
		});
	});

	it(`throws an Error and halts execution of the phunkuence if you reference an asyncValue before the asyncValue is retrieved`, (done) => {
		store.dispatch([
			{type: 'STEP_0'},
			{type: 'STEP 1', value: asyncValue("value1")},
			{
				name: "value1",
				async phunk() {
					return 1.02;
				}
			},
			{type: 'STEP 2'},
		])
		.then(() => {
			fail("this phunkuence should have failed");
			done();
		})
		.catch(err => {
			// expected
			expect(store.getActions()).toEqual([{type: 'STEP_0'}]);
			done();
		});
	});
});
