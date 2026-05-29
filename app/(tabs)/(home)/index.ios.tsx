// ─── Layout toggle ────────────────────────────────────────────────────────────
// Set USE_PROTO = false to revert to the original card layout for any build.

import HomeScreenCards from './_HomeScreenCards';
import HomeScreenProto from './_HomeScreenProto';

const USE_PROTO = true;

export default USE_PROTO ? HomeScreenProto : HomeScreenCards;
