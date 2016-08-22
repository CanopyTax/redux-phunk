import { asyncValue } from '../../src/redux-phunk.js';

describe(`dispatching a vanilla redux action`, () => {
	it(`should work fine if done without referencing anything phunky`, () => {
		const returnValue = store.dispatch({type: 'VANILLA', load: "some data"});
		expect(returnValue).toEqual({type: 'VANILLA', load: 'some data'});
		expect(store.getActions()).toEqual([{type: 'VANILLA', load: "some data"}]);
	});

	it(`throws an error if you try to reference a redux-phunk asyncValue in the vanilla action`, () => {
		expect(() => {
			store.dispatch({type: 'PHUNKY', val: asyncValue("val")})
		}).toThrow();
	});

	it(`should throw if you try to make the action type a redux-phunk asyncValue`, () => {
		expect(() => {
			store.dispatch({type: asyncValue("theType")});
		}).toThrow();
	});
});
