import configureStore from 'redux-mock-store';
import phunk from '../src/redux-phunk.js';

const mockStore = configureStore([phunk]);

beforeEach(() => {
	global.store = mockStore(phunk);
})
