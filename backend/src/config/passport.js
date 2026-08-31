const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const ZaloStrategy = require('passport-zalo').Strategy;
const pool = require('./mysql');
const env = require('./env');
const { handleSocialLogin } = require('../services/social-auth.service');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, email, full_name, role, deposit_code FROM users WHERE id = ?',
      [id]
    );
    if (rows.length > 0) {
      done(null, rows[0]);
    } else {
      done(null, false);
    }
  } catch (err) {
    done(err);
  }
});

// Passport strategy callback wrapper
const passportCallback = async (profile, provider, done) => {
  try {
    const user = await handleSocialLogin(profile, provider);
    done(null, user);
  } catch (err) {
    done(err);
  }
};

// Google Strategy
if (env.oauth.google.clientId && env.oauth.google.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.oauth.google.clientId,
        clientSecret: env.oauth.google.clientSecret,
        callbackURL: env.oauth.google.callbackUrl,
      },
      (accessToken, refreshToken, profile, done) => {
        passportCallback(profile, 'google', done);
      }
    )
  );
}

// Facebook Strategy
if (env.oauth.facebook.appId && env.oauth.facebook.appSecret) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: env.oauth.facebook.appId,
        clientSecret: env.oauth.facebook.appSecret,
        callbackURL: env.oauth.facebook.callbackUrl,
        profileFields: ['id', 'displayName', 'emails'],
      },
      (accessToken, refreshToken, profile, done) => {
        passportCallback(profile, 'facebook', done);
      }
    )
  );
}

// Zalo Strategy
if (env.oauth.zalo.appId && env.oauth.zalo.appSecret) {
  passport.use(
    new ZaloStrategy(
      {
        clientID: env.oauth.zalo.appId,
        clientSecret: env.oauth.zalo.appSecret,
        callbackURL: env.oauth.zalo.callbackUrl,
      },
      (accessToken, refreshToken, profile, done) => {
        passportCallback(profile, 'zalo', done);
      }
    )
  );
}

module.exports = passport;
