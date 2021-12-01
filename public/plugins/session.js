export default async ({ store, app, env, $vuetify, route }) => {
  let publicUrl = window.location.origin + env.basePath
  if (publicUrl.endsWith('/')) publicUrl = publicUrl.substr(0, -1)
  store.commit('setAny', {
    env: {
      ...env,
      // reconstruct this env var that we used to have but lost when implementing multi-domain exposition
      publicUrl
    }
  })
  store.dispatch('session/init', {
    cookies: app.$cookies,
    directoryUrl: env.directoryUrl
  })
  // no need to maintain keepalive / readcookie loops in every embedded view
  if (!route.path.startsWith('/embed/')) {
    store.dispatch('session/loop', app.$cookies)
  }
}
