# notify
A simple server to manage notifications feeds for our users. Notifications are stored and pushed to various channels.

## Development

```
npm run dev-eps
sh scripts/init.sh
npm run dev-client
npm run dev-server
docker-compose exec router sh -c "mongo < /scripts/init-sharding.js"
```

When both servers are ready, go to [http://localhost:5994](http://localhost:5994) and chose an account in `test/resources/users.json` to login with its email and password.

A large part of the functionalities are intended to be integrated as iframes. Check these pages:

  - [managing the user's devices](http://localhost:5994/embed/devices)
  - [overview of the user's subscription](http://localhost:5994/embed/subscriptions)
  - [subscribe to an organization's events as a member](http://localhost:5994/embed/subscribe?key=topic1&title=Topic1&sender=organization:orga1)
  - [subscribe to an organization's events as a member with specific role](http://localhost:5994/embed/subscribe?key=topic1&title=Topic1&sender=organization:orga1::admin)
  - [subscribe to an organization's events as a department member](http://localhost:5994/embed/subscribe?key=topic1&title=Topic1&sender=organization:orga2:dep1)


Run test suite:

```
npm run test
```

Test building the docker image:

```
docker build --network=host -t notify-dev .
```