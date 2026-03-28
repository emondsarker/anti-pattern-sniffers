// True positive: deeply nested promise chains (the "pyramid of doom" with promises)
fetch('/api/users')
  .then((response) => {
    return response.json().then((users) => {
      return fetch('/api/posts').then((postResponse) => {
        return postResponse.json().then((posts) => {
          return fetch('/api/comments').then((commentResponse) => {
            return commentResponse.json().then((comments) => {
              mergeData(users, posts, comments);
            });
          });
        });
      });
    });
  });
