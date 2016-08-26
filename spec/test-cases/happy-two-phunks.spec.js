import { asyncValue } from '../../src/redux-phunk.js';

describe('happy-two-phunks', () => {
	let loggedInUserPhunkCalled, tenantPhunkCalled;

	function bootstrapApp() {
		return [
			{
				type: "GETTING_USER",
			},
			{
				name: "loggedInUser",
				async phunk() {
					loggedInUserPhunkCalled = true;
					return {id: 1, name: "A User"};
				},
			},
			{
				type: "GOT_USER",
				user: asyncValue("loggedInUser"),
			},
			{
				type: "GETTING_TENANT",
			},
			{
				name: "tenant",
				async phunk() {
					tenantPhunkCalled = true;
					return {id: 2, name: "A Tenant"}
				}
			},
			{
				type: "GOT_TENANT",
				tenant: asyncValue("tenant"),
			},
		];
	}

	beforeEach(() => {
		loggedInUserPhunkCalled = false;
		tenantPhunkCalled = false;
	})

	it(`returns a promise`, () => {
		const promise = store.dispatch(bootstrapApp());
		expect(promise instanceof Promise).toBe(true);
	});

	it(`calls loggedInUser and tenant phunks`, (done) => {
		store
		.dispatch(bootstrapApp())
		.then(() => {
			expect(loggedInUserPhunkCalled).toBe(true);
			expect(tenantPhunkCalled).toBe(true);
			done();
		})
		.catch(err => {
			fail(err);
			done();
		})
	});

	it(`resolves the promise with the phunk values`, (done) => {
		store
		.dispatch(bootstrapApp())
		.then(values => {
			const {loggedInUser, tenant} = values;
			expect(loggedInUser).toEqual({id: 1, name: "A User"})
			expect(tenant).toEqual({id: 2, name: "A Tenant"})
			done();
		})
		.catch(err => {
			fail(err);
			done();
		});
	});

	it(`dispatches the actions but doesn't dispatch the phunks`, (done) => {
		store
		.dispatch(bootstrapApp())
		.then(() => {
			expect(store.getActions())
			.toEqual([
				{type: 'GETTING_USER'},
				{type: 'GOT_USER', user: {id: 1, name: "A User"}},
				{type: 'GETTING_TENANT'},
				{type: 'GOT_TENANT', tenant: {id: 2, name: "A Tenant"}},
			]);
			done();
		})
		.catch(err => {
			fail(err);
			done();
		});
	})
});
