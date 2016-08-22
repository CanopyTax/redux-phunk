import { flattenDeep } from 'lodash';

const phunkMiddleware = store => next => action => {
	if (Array.isArray(action)) {
		const phunkuence = flattenDeep(action);
		phunkuence.phunkValues = {};
		return new Promise((resolve, reject) => {
			executePhunkuence(phunkuence, store.dispatch, next, resolve, reject);
		})
	} else if (isPhunk(action)) {
		// apparently they just want to run a phunk but don't want to actually dispatch anything
		throw new Error(`Tried to dispatch a phunk that isn't inside of a phunkquence (an array of objects)`);
	} else {
		const phunkValues = {};
		return executeAction(action, phunkValues, next);
	}
}

export default phunkMiddleware;

export function asyncValue(phunkName) {
	if (typeof phunkName !== 'string' || phunkName === '') {
		throw new Error(`redux-phunk's asyncValue function must be called with a non-empty string name of a phunk`);
	}
	return {
		__REDUX_PHUNK_ASYNC_VALUE__: true,
		phunkName,
	};
}

function executePhunkuence(phunkuence, dispatch, next, resolve, reject) {
	for (let i=0; i<phunkuence.length; i++) {
		const action = phunkuence[i];
		if (isPhunk(action)) {
			return executePhunk(action, phunkuence.phunkValues, dispatch, next, phunkuence.slice(i + 1), resolve, reject)
				.then(resolve)
				.catch(err => {
					if (phunkuence.length > 0 && isCatchAll(phunkuence[phunkuence.length - 1])) {
						executeCatchAll(phunkuence[phunkuence.length - 1], err)
						.then(reject) // the catchAll is working fine, but there still is an error in a previous phunk
						.catch(reject);
					} else {
						reject(err);
					}
				});
		} else if (isCatchAll(action)) {
			if (i < phunkuence.length - 1) {
				reject(new Error(`redux-phunk: a catchAll object must be the last object in a phunkuence`));
			}
			// Do nothing, the catchAll will only come into play if there's an error.
		} else {
			executeAction(action, phunkuence.phunkValues, next);
		}
	}

	return phunkuence.phunkValues;
}

function executePhunk(phunk, phunkValues, dispatch, next, remainingPhunkuence=[], resolve, reject) {
	const valueOf = function(phunkName) {
		if (typeof phunkName !== 'string' || phunkName === '') {
			throw new Error(`redux-phunk's valueOf function must be called with a non-empty string name of a phunk`);
		}
	}
	const asyncResult = phunk.phunk(valueOf);

	let promise;

	if (asyncResult instanceof Promise || (typeof asyncResult.then === 'function' && typeof asyncResult.catch === 'function')) {
		 promise = asyncResult;
	} else if (typeof asyncResult.subscribe === 'function' && typeof asyncResult.first === 'function' && typeof asyncResult.toPromise === 'function') {
		// observable was returned, we turn it into a promise
		promise = asyncResult.first().toPromise();
	} else {
		throw new Error(`Phunk '${phunk.name}' did not return a promise or an observable`);
	}

	return promise.then(value => {
		phunkValues[phunk.name] = value;
		remainingPhunkuence.phunkValues = phunkValues;
		return executePhunkuence(remainingPhunkuence, dispatch, next, resolve, reject);
	});
}

function executeAction(action, phunkValues, next) {
	const dispatchableAction = {};
	for (let property in action) {
		if (action[property] && action[property].__REDUX_PHUNK_ASYNC_VALUE__) {
			if (property === 'type') {
				throw new Error(`Actions may not set their type to be a redux-phunk asyncValue`);
			}

			if (!phunkValues.hasOwnProperty(action[property].phunkName)) {
				throw new Error(`No such asyncValue '${action[property].phunkName}' for action of type '${action.type}'. Did you forget to make phunk called '${action[property].phunkName}'?`);
			}

			dispatchableAction[property] = phunkValues[action[property].phunkName];
		} else {
			dispatchableAction[property] = action[property];
		}
	}

	return next(dispatchableAction);
}

function executeCatchAll(obj, err) {
	const asyncResult = obj.catchAll(err);
	let promise;
	if (asyncResult instanceof Promise || (typeof asyncResult.then === 'function' && typeof asyncResult.catch === 'function')) {
		 promise = asyncResult;
	} else if (typeof asyncResult.subscribe === 'function' && typeof asyncResult.first === 'function' && typeof asyncResult.toPromise === 'function') {
		// observable was returned, we turn it into a promise
		promise = asyncResult.first().toPromise();
	} else {
		promise = Promise.resolve(asyncResult);
	}

	return promise;
}

function isPhunk(action) {
	const looksLikePhunk = typeof action === 'object' && typeof action.phunk === 'function';
	if (looksLikePhunk && action.type) {
		throw new Error(`phunks may not have types`);
	}

	if (looksLikePhunk && !action.name) {
		throw new Error(`phunks must have a name`);
	}

	return looksLikePhunk;
}

function isPhunkuence(action) {
	const isArray = Array.isArray(action);
	if (isArray) {
		for (let i=0; i<action.length; i++) {
			if (typeof action[i] !== 'string') {
				throw new Error(`A dispatched array (a phunkuence) must consist of only objects`);
			}
		}
	}

	return isArray;
}

function isCatchAll(action) {
	const looksLikeIt = typeof action === 'object' && typeof action.catchAll === 'function';
	if (looksLikeIt && action.type) {
		throw new Error(`catchAll must not have a type`);
	}

	return looksLikeIt;
}
