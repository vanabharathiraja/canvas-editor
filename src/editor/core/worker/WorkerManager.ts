import { version } from '../../../../package.json'
import { Draw } from '../draw/Draw'
import WordCountWorker from './works/wordCount?worker&inline'
import CatalogWorker from './works/catalog?worker&inline'
import GroupWorker from './works/group?worker&inline'
import ValueWorker from './works/value?worker&inline'
import LayoutWorker from './works/layout?worker&inline'
import { ICatalog } from '../../interface/Catalog'
import { IEditorResult } from '../../interface/Editor'
import { IGetValueOption } from '../../interface/Draw'
import { deepClone } from '../../utils'
import {
  LayoutWorkerMessageType,
  ILayoutWorkerRequest,
  ILayoutWorkerResponse,
  ILayoutWorkerError,
  IWorkerElement,
  ILayoutOptions,
  IWorkerRow
} from './interface/Layout'

export class WorkerManager {
  private draw: Draw
  private wordCountWorker: Worker
  private catalogWorker: Worker
  private groupWorker: Worker
  private valueWorker: Worker
  private layoutWorker: Worker
  private layoutRequestId = 0

  constructor(draw: Draw) {
    this.draw = draw
    this.wordCountWorker = new WordCountWorker()
    this.catalogWorker = new CatalogWorker()
    this.groupWorker = new GroupWorker()
    this.valueWorker = new ValueWorker()
    this.layoutWorker = new LayoutWorker()
  }

  public getWordCount(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.wordCountWorker.onmessage = evt => {
        resolve(evt.data)
      }

      this.wordCountWorker.onerror = evt => {
        reject(evt)
      }

      const elementList = this.draw.getOriginalMainElementList()
      this.wordCountWorker.postMessage(elementList)
    })
  }

  public getCatalog(): Promise<ICatalog | null> {
    return new Promise((resolve, reject) => {
      this.catalogWorker.onmessage = evt => {
        resolve(evt.data)
      }

      this.catalogWorker.onerror = evt => {
        reject(evt)
      }

      const elementList = this.draw.getOriginalMainElementList()
      const positionList = this.draw.getPosition().getOriginalMainPositionList()
      // During bounded visible layout the positionList only covers the
      // computed pages, not the full document. Sending mismatched arrays
      // to the worker causes "Cannot read properties of undefined
      // (reading 'pageNo')" crashes. Defer the catalog update — the full
      // idle layout fires after FULL_LAYOUT_IDLE_MS and will trigger
      // another contentChange which re-requests the catalog.
      if (positionList.length < elementList.length) {
        resolve(null)
        return
      }
      this.catalogWorker.postMessage({
        elementList,
        positionList
      })
    })
  }

  public getGroupIds(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.groupWorker.onmessage = evt => {
        resolve(evt.data)
      }

      this.groupWorker.onerror = evt => {
        reject(evt)
      }

      const elementList = this.draw.getOriginalMainElementList()
      this.groupWorker.postMessage(elementList)
    })
  }

  public getValue(options?: IGetValueOption): Promise<IEditorResult> {
    return new Promise((resolve, reject) => {
      this.valueWorker.onmessage = evt => {
        resolve({
          version,
          data: evt.data,
          options: deepClone(this.draw.getOptions())
        })
      }

      this.valueWorker.onerror = evt => {
        reject(evt)
      }

      this.valueWorker.postMessage({
        data: this.draw.getOriginValue(options),
        options
      })
    })
  }

  /**
   * Ping the layout worker to verify it's responsive.
   */
  public pingLayoutWorker(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Layout worker ping timeout'))
      }, 5000)

      this.layoutWorker.onmessage = evt => {
        clearTimeout(timeout)
        if (evt.data.type === LayoutWorkerMessageType.PONG) {
          resolve(true)
        } else {
          reject(new Error('Unexpected response from layout worker'))
        }
      }

      this.layoutWorker.onerror = evt => {
        clearTimeout(timeout)
        reject(evt)
      }

      this.layoutWorker.postMessage({
        type: LayoutWorkerMessageType.PING
      })
    })
  }

  /**
   * Compute layout in the background worker.
   * Returns computed rows with element indices.
   */
  public computeLayoutAsync(
    elements: IWorkerElement[],
    options: ILayoutOptions
  ): Promise<{
    rows: IWorkerRow[]
    pageBoundaryStates?: ILayoutWorkerResponse['pageBoundaryStates']
    computeTimeMs: number
  }> {
    return new Promise((resolve, reject) => {
      const requestId = ++this.layoutRequestId

      this.layoutWorker.onmessage = evt => {
        const response = evt.data

        // Only handle responses for this request
        if (response.requestId !== requestId) {
          return
        }

        if (response.type === LayoutWorkerMessageType.LAYOUT_RESULT) {
          const result = response as ILayoutWorkerResponse
          resolve({
            rows: result.rows,
            pageBoundaryStates: result.pageBoundaryStates,
            computeTimeMs: result.computeTimeMs
          })
        } else if (response.type === LayoutWorkerMessageType.LAYOUT_ERROR) {
          const error = response as ILayoutWorkerError
          reject(new Error(error.error))
        }
      }

      this.layoutWorker.onerror = evt => {
        reject(evt)
      }

      const request: ILayoutWorkerRequest = {
        type: LayoutWorkerMessageType.COMPUTE_LAYOUT,
        requestId,
        elements,
        options
      }

      this.layoutWorker.postMessage(request)
    })
  }

  /**
   * Get the current layout request ID (for version tracking).
   */
  public getLayoutRequestId(): number {
    return this.layoutRequestId
  }
}
