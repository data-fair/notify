<template>
  <v-app>
    <v-app-bar
      v-if="user"
      :height="$vuetify.breakpoint.mdAndDown ? 134 : 72"
      app
    >
      <v-layout
        wrap
        align-center
      >
        <v-flex
          xs6
          sm4
          md3
          lg2
          text-left
        >
          <div class="logo-container">
            <img
              v-if="env.theme.logo"
              :src="env.theme.logo"
            >
            <img
              v-else
              src="../static/logo.svg"
            >
          </div>
        </v-flex>
        <v-flex
          lg8
          order-lg2
          xs12
          order-xs3
        >
          <v-tabs
            centered
            icons-and-text
            grow
            show-arrows
            color="dark"
          >
            <v-tabs-slider color="accent" />
            <v-tab :to="localePath({name:'subscriptions'})">
              Souscriptions
              <v-icon>mdi-routes</v-icon>
            </v-tab>
            <v-tab :to="localePath({name:'notifications'})">
              Notifications
              <v-icon>mdi-bell</v-icon>
            </v-tab>
            <v-tab :to="localePath({name:'push-registrations'})">
              Appareils
              <v-icon>mdi-devices</v-icon>
            </v-tab>
          </v-tabs>
        </v-flex>
        <v-flex
          xs6
          sm8
          md9
          order-xs2
          lg2
          order-lg3
          text-right
          text-lg-center
        >
          <v-menu
            v-if="activeAccount"
            offset-y
            left
          >
            <template #activator="{ on }">
              <v-btn
                v-if="activeAccount"
                id="toolbar-button-account"
                text
                large
                v-on="on"
              >
                {{ activeAccount.type === 'user' ? 'personnel' : 'organisation ' }}<br> {{ activeAccount.name }} <v-icon>mdi-chevron-down</v-icon>
              </v-btn>
            </template>
            <v-list>
              <template v-if="user.organizations && user.organizations.length">
                <v-subheader>Changer de compte</v-subheader>
                <v-list-item
                  v-if="activeAccount.type !== 'user'"
                  @click="switchOrganization()"
                >
                  <v-list-item-title>Compte personnel</v-list-item-title>
                </v-list-item>
                <v-list-item
                  v-for="organization in user.organizations.filter(o => activeAccount.type === 'user' || activeAccount.id !== o.id)"
                  :key="organization.id"
                  @click="switchOrganization(organization.id)"
                >
                  <v-list-item-title>Organisation {{ organization.name }}</v-list-item-title>
                </v-list-item>
                <v-divider />
              </template>

              <v-list
                v-if="user.isAdmin"
                color="red"
                dark
              >
                <v-subheader>Administration</v-subheader>
                <v-list-item to="/admin/global-topics">
                  <v-list-item-title>Sujets globaux</v-list-item-title>
                </v-list-item>
              </v-list>

              <v-list-item
                id="toolbar-menu-logout"
                color="warning"
                @click="logout"
              >
                <v-list-item-icon>
                  <v-icon color="warning">
                    mdi-close-circle-outline
                  </v-icon>
                </v-list-item-icon>
                <v-list-item-title>Déconnexion</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
          <lang-switcher style="position: absolute; right: 8px; top: 16px;" />
        </v-flex>
      </v-layout>
    </v-app-bar>

    <v-main>
      <notifications />
      <nuxt v-if="user" />
      <v-container
        v-else
        class="text-center pt-12"
      >
        <v-btn
          color="primary"
          @click="$store.dispatch('session/login')"
        >
          Se connecter
        </v-btn>
      </v-container>
    </v-main>

    <v-footer
      v-if="$route.name !== 'cartographie'"
      dark
    >
      <v-col
        class="text-center"
        cols="12"
      >
        &copy; <a
          href="http://koumoul.com"
          target="_blank"
        >Koumoul</a>
      </v-col>
    </v-footer>
  </v-app>
</template>

<script>
import Notifications from '../components/notifications.vue'
import langSwitcher from '../components/lang-switcher.vue'
import { mapState, mapGetters } from 'vuex'

export default {
  components: { Notifications, langSwitcher },
  data () {
    return {
      uptimeUrl: process.env.uptimeUrl
    }
  },
  computed: {
    ...mapState(['env']),
    ...mapState('session', ['user']),
    ...mapGetters('session', ['activeAccount'])
  },
  methods: {
    logout () {
      this.$store.dispatch('session/logout')
      this.$store.dispatch('session/login')
    },
    switchOrganization (orgId) {
      this.$store.dispatch('session/switchOrganization', orgId)
      window.location.reload()
    }
  }
}
</script>

<style>
.v-app-bar .logo-container img {
  height:68px;
}
</style>
