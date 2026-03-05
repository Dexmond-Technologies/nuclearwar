import { DeckGLMap } from '../IMPROVE_EARTH/components/DeckGLMap';
import { LAYER_ZOOM_THRESHOLDS } from '../IMPROVE_EARTH/components/DeckGLMap';

// Expose to window so game.html can initialize it
(window as any).DeckGLMap = DeckGLMap;
(window as any).LAYER_ZOOM_THRESHOLDS = LAYER_ZOOM_THRESHOLDS;
