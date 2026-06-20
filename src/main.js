// App entry point. The shell renders a list of registered features; the timeline
// is the first one. Adding a feature = create src/features/<id>/, export a
// descriptor (see src/app/registry.js), and add it to the list below.
import './styles.css';
import { startApp } from './app/shell.js';
import home from './features/home/index.js';
import timeline from './features/timeline/index.js';

// Order matters: the first feature is the default route ('/'), so Home is the
// post-login landing. New tools just get added to this list.
startApp({ features: [home, timeline] });
