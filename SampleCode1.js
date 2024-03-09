import React, { useEffect, useRef, useState } from "react"
import {
  RenderingEngine,
  Types,
  Enums,
  cache,
  eventTarget,
  getRenderingEngine,
} from "@cornerstonejs/core"
import * as cornerstoneTools from "@cornerstonejs/tools"
import createImageIdsAndCacheMetaData from "./helper/createImageIdsAndCacheMetaData"
import s from "./Cornerstone.module.scss"
import { Instance } from "../types"
import { useDispatch } from "../context"
import { wadoURL } from "./constants"
import { isSingleImageAndStack } from "../../../utils"
import "./initialization"

const {
  StackScrollMouseWheelTool,
  WindowLevelTool,
  ZoomTool,
  ToolGroupManager,
  Enums: csToolsEnums,
} = cornerstoneTools

const { ViewportType, Events } = Enums
const { MouseBindings, KeyboardBindings } = csToolsEnums

cornerstoneTools.addTool(StackScrollMouseWheelTool)
cornerstoneTools.addTool(WindowLevelTool)
cornerstoneTools.addTool(ZoomTool)

const toolGroup = ToolGroupManager.createToolGroup("toolGroupId")
toolGroup?.addTool(StackScrollMouseWheelTool.toolName)
toolGroup?.addTool(WindowLevelTool.toolName)
toolGroup?.addTool(ZoomTool.toolName)

toolGroup?.setToolActive(StackScrollMouseWheelTool.toolName)
toolGroup?.setToolActive(WindowLevelTool.toolName, {
  bindings: [
    {
      mouseButton: MouseBindings.Primary, // Left Click
    },
  ],
})
toolGroup?.setToolActive(ZoomTool.toolName, {
  bindings: [
    {
      mouseButton: MouseBindings.Primary, // Ctrl + Left Click
      modifierKey: KeyboardBindings.Ctrl,
    },
  ],
})

interface Instance {
  contentType: "dicom"
  studyId: string
  seriesId: string
  instanceId: string
  frames: number
  modality: string
}

interface OwnProps {
  instance: Instance
}

const renderingEngineId = "myRenderingEngine"
let renderingEngine: Types.IRenderingEngine | undefined

const Cornerstone = ({ instance }: OwnProps) => {
  const [loading, setLoading] = useState(true)
  const imageIdsCount = useRef<number | null>(null)
  const imageIdsLoaded = useRef<number | null>(null)
  const prevPropsRef = useRef<Instance | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const { state } = useDispatch()

  const isSingleImage = isSingleImageAndStack(instance)

  useEffect(() => {
    window.addEventListener("resize", handleResize)
    return () => {
      // renderingEngine?.destroy()
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  useEffect(() => {
    if (renderingEngine) {
      renderingEngine?.resize(true, false)
    }
  }, [state.layout])

  useEffect(() => {
    // Compare the new props with the old props
    if (instance !== prevPropsRef.current) {
      const viewportInput: Types.PublicViewportInput = {
        viewportId: instance.instanceId,
        type: ViewportType.STACK,
        element: viewportRef.current as HTMLDivElement,
        defaultOptions: {
          background: [0, 0, 0],
        },
      }

      renderingEngine = getRenderingEngine(renderingEngineId)

      if (!renderingEngine || renderingEngine.hasBeenDestroyed) {
        // Instantiate a rendering engine
        renderingEngine = new RenderingEngine(renderingEngineId)
      }

      if (prevPropsRef.current)
        renderingEngine.disableElement(prevPropsRef.current.instanceId)
      renderingEngine.enableElement(viewportInput)

      const baseImageURI = `${isSingleImage ? "web" : "wadors"}:${wadoURL}/studies/${instance.studyId}/series/${instance.seriesId}/instances/${instance.instanceId}/frames/1`;

      const imageURIs = [
        `${baseImageURI}/rendered`,
        baseImageURI
      ];
      
      let isLoaded;

      for (const imageURI of imageURIs) {
        const cachedImage = cache.getCachedImageBasedOnImageURI(imageURI);
      
        if (cachedImage !== undefined) {
          isLoaded = cachedImage.loaded;
          break; // Exit the loop if a valid loaded value is found
        }
      }

      if (!isLoaded) setLoading(true)
      else setLoading(false)
      render()
    }
    imageIdsLoaded.current = 0
    // Update the previous props ref
    prevPropsRef.current = instance
    // eslint-disable-next-line
  }, [instance])

  eventTarget?.addEventListener(Events.IMAGE_LOADED, (e: unknown) => {
    imageIdsLoaded.current = (imageIdsLoaded?.current || 0) + 1
    if (
      imageIdsCount.current !== null &&
      imageIdsLoaded.current >= imageIdsCount.current
    )
      setLoading(false)
  })

  const handleResize = () => {
    if (renderingEngine) {
      renderingEngine?.resize(true, false)
    }
  }

  const render = async () => {
    try {
      const viewportId = instance.instanceId

      let imageIds = [
        `web:${wadoURL}/studies/${instance.studyId}/series/${instance.seriesId}/instances/${viewportId}/frames/1/rendered`,
      ]

      // Get Cornerstone imageIds and fetch metadata into RAM
      imageIds = await createImageIdsAndCacheMetaData({
        StudyInstanceUID: instance.studyId,
        SeriesInstanceUID: instance.seriesId,
        SOPInstanceUID: isSingleImage ? viewportId : null,
        wadoRsRoot: wadoURL,
        isSingleImage,
      })

      imageIdsCount.current = imageIds.length

      toolGroup?.addViewport(viewportId, renderingEngineId)

      // get renderingEngine from cache if it exists
      renderingEngine = getRenderingEngine(renderingEngineId)

      let viewport = renderingEngine?.getViewport(viewportId) as
        | Types.IVolumeViewport
        | Types.IStackViewport

      const stackViewport = viewport as Types.IStackViewport
      if (!isSingleImage) {
        imageIds.forEach((imageId, index) => {
          stackViewport.setStack(imageIds, index)
        })
      }
      stackViewport.setStack(imageIds)
      viewport = stackViewport
      // Render the image
      // viewport?.render()
      renderingEngine?.renderViewports([viewportId])
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <div ref={viewportRef} style={{ width: "100%", height: "100%" }}>
      {loading ? <p className={s.loading}>Loading...</p> : null}
    </div>
  )
}

export default Cornerstone