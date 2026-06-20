// Feature registry — the app is a list of features. Each feature is a descriptor:
//
//   {
//     id: string,
//     path: string,                         // app-route path, e.g. '/'
//     requiresAuth: boolean,                // gated behind sign-in when auth is enabled
//     navLabel: (locale) => string,         // label in the top nav
//     mount(container, ctx): void,          // render the feature's app view
//     mountPublic?(container, ctx, match),  // render an unauthenticated/public route
//     matchPublic?(pathname, params) => match|null, // claim a public route
//     reset?(): void,                       // drop per-session state (e.g. on sign-out)
//   }
//
// Adding a feature = create src/features/<id>/, export a descriptor, register it.

const features = [];

export function registerFeature(feature) {
  if (!features.some((f) => f.id === feature.id)) features.push(feature);
  return feature;
}

export function getFeatures() {
  return features.slice();
}

export function getFeature(id) {
  return features.find((f) => f.id === id) || null;
}
