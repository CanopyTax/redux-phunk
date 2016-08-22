# redux-phunk
=============
A redux [middleware](http://redux.js.org/docs/advanced/Middleware.html) to encourage smarter reducers and more phunktional action creators.

## Motivation
Reducers are the best place to put conditional logic and data transformations, but many redux middleware patterns encourage putting that stuff into action creators. By moving logic out of action creators and into reducers, the logic is more reusable and testable. Redux-phunk makes your action creators just smart enough to handle async actions like API calls, but keeps them dumb enough so that conditional logic and data transformations remain in reducers. As a result, action creators are more functional and more easily tested.

## What does it do?
Redux-phunk allows you to dispatch an array of actions that will be executed in sequence. For asynchronous code such as ajax, a special type of object (called a `phunk`) is included in the array, which all subsequent actions in the sequence will wait for.

When you dispatch an array of actions, the [return value will be a Promise](#knowing-when-a-sequence-is-done) that resolves when all of the actions in the array have been dispatched.

```js
import { asyncValue } from 'redux-phunk';

function retrieveWeather() {
  return [
    {
      type: "GETTING_WEATHER",
    },
    {
      name: "currentWeather",
      async phunk() {
        return await fetch('/api/weather')
          .then(response => response.json());
      }
    },
    {
      type: "GOT_WEATHER",
      weather: asyncValue("currentWeather"),
    }
  ];
}

store.dispatch(retrieveWeather()).then(() => {
  console.log('done dispatching sequence!')
});
```

## Installation
```bash
npm install --save redux-phunk
```
Then use [applyMiddleware](http://redux.js.org/docs/api/applyMiddleware.html) to use redux-phunk.
```js
import reducer from './reducer.js';
import { createStore, applyMiddleware } from 'redux';
import phunk from 'redux-phunk';

const store = createStore(reducer, applyMiddleware(phunk));

store.dispatch(myAction());
```

## Phunks?? That's not even a word!
A "phunk" is just an object with `name` and `phunk` properties. The `phunk` property is a function that returns an asynchronous value, such as a Promise or a (single-valued) Observable. Examples:

```js
// es2016
{
  name: "getUser",
  async phunk() {
    return await fetch('/api/users/1').then(response => response.json());
  },
}
```
```js
// es6 + Observables
{
  name: "getTypeaheadOptions",
  phunk() {
    return Observable.just([1, 2, 3]);
  }
}
```
```js
// es5
{
  name: "saveComment",
  phunk: function() {
    return new Promise(function(resolve, reject) {
      doAjax(function(err) {
        if (err) {
          reject(err);
        } else {
          resolve()
        }
      }
    }
  }
}
```

## Putting async values into vanilla redux actions
Running asynchronous code as a "phunk" is great, but in order to actually use the asynchronous value, redux-phunk provides the `asyncValue` function. This is used inside of vanilla redux actions so that the asynchronous value is passed to the reducer, where it will be transformed and handled properly. In the following example, the /api/books/:id api will first be called. Once the ajax request is completed, GOT_BOOK will be dispatched with `newBook` set to whatever the api returned for the book:

```js
import { asyncValue } from 'redux-phunk';

function getBook(id) {
  return [
    {
      name: 'book',
      async phunk() {
        return await fetch(`/api/books/${id}`)
          .then(response => response.json());
      }
    },
    {
      type: 'GOT_BOOK',
      newBook: asyncValue('book'),
    },
  ]
}

store.dispatch(getBook());
```

## Using async values inside of another phunk
If you need to reuse asynchronous values across multiple phunks, you can call the `valueOf` function provided as the first argument to each phunk.
```js
import { asyncValue } from 'redux-phunk';

function getUserPreferences(userId) {
  return [
    {
      name: 'user',
      async phunk() {
        return await fetch(`/api/users/${userId}`)
          .then(response => response.json())
      },
    },
    {
      name: 'userPreferences',
      async phunk(valueOf) {
        const userPreferencesId = valueOf('user').preferencesId;
        return await fetch(`/api/user-preferences/${userPreferencesId}`)
          .then(response => response.json())
      }
    },
    {
      type: 'NEW_USER_PREFERENCES',
      preferences: asyncValue('userPreferences'),
    }
  ];
}
```

## Knowing when a sequence is done
When dispatching an array of actions (including phunks), the return value of `dispatch()` will be a promise that resolves when all the actions have been dispatched. The promise will be resolved with all values returned from phunks in an object with key/value pairs. For example:

```js
store.dispatch(myAction()).then(values => {
  console.log(values)
  // {value1: "this is a value", value2: "this is another value"}
})

function myAction() {
  return [
    {
      name: 'value1',
      async phunk() {
        return "this is a value";
      }
    },
    {
      type: 'VALUE_1',
      val: asyncValue('value1'),
    },
    {
      name: 'value2',
      async phunk() {
        return "this is another value";
      }
    },
    {
      type: 'VALUE_2',
      val: asyncValue('value2'),
    },
  ];
}
```

## Catching errors
You can handle errors for each phunk, for the entire sequence of actions, or both. If handling errors for the entire sequence of actions, use a `catchAll` object at the very end of your array. `catchAll` functions may return nothing, a synchronous value, a Promise, or an Observable.
```js
import { asyncValue } from 'redux-phunk';

function deletePost(id) {
  return [
    {
      name: 'deletePost',
      async phunk() {
        return await fetch(`/api/posts/${id}`, {method: 'DELETE'})
          .then(response => response.json())
          .catch(err => {
            // This is where I can handle an error for just this one phunk
          })
      },
    },
    {
      type: 'DELETED_POST',
      id,
    },
    {
      catchAll(err) {
        // This is where all errors will be funneled no matter what
        logErrors.log(err)
      }
    },
  ];
}
```
