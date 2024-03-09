import { useEffect, useRef } from "react";

import {
  Enums,
  RenderingEngine,
  imageLoader,
  metaData,
  volumeLoader,
} from "@cornerstonejs/core";

import { hardcodedMetaDataProvider } from "./utils/hardcodedMetaDataProvider";
import { initDemo } from "./utils/initDemo";
import { registerWebImageLoader } from "./utils/registerWebImageLoader";

const imageIds = ["web:https://picsum.photos/500"];
const renderingEngineId = "myRenderingEngine";
const viewportId = "myViewport";
const volumeId = "myVolume";

registerWebImageLoader(imageLoader);

metaData.addProvider(
  (type, imageId) => hardcodedMetaDataProvider(type, imageId, imageIds),
  10000
);

/** 
 * @description Basic working example of cornerstone3D with React using a stripped down version of the webLoader example linked below. Their initDemo function seemed to be the key to getting this working.
 * @link https://github.com/cornerstonejs/cornerstone3D/blob/main/packages/core/examples/webLoader/index.ts
 * @link https://github.com/cornerstonejs/cornerstone3D/blob/main/utils/demo/helpers/initDemo.js
 */
async function run(container: HTMLDivElement) {
  try {
    const { initializationResult } = await initDemo();

    if (!initializationResult) throw new Error("Initialization failed");

    const renderingEngine = new RenderingEngine(renderingEngineId);

    const volume = await volumeLoader.createAndCacheVolume(volumeId, { imageIds });

    renderingEngine.setViewports([
      {
        element: container,
        type: Enums.ViewportType.STACK,
        viewportId: viewportId,
      },
    ]);

    const viewport = renderingEngine.getStackViewports()[0];

    volume.load();

    await viewport.setStack(imageIds);

    await viewport.setImageIdIndex(0);

    renderingEngine.render();
  } catch (error) {
    console.error(error);
  }
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    run(container);
  }, []);

  return (
    <div
      id={viewportId}
      ref={containerRef}
      style={{
        height: "500px",
        width: "500px",
      }}
    />
  );
}