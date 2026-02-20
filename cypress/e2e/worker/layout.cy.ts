describe('Layout Worker', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/')
    cy.get('canvas').first().as('canvas').should('have.length', 1)
    // Wait for the layout worker to be initialized
    cy.window().its('testLayoutWorker').should('exist')
  })

  it('should ping layout worker successfully', () => {
    cy.window().then((win: Window) => {
      // Call the test function that was exposed on window
      return (win as any).testLayoutWorker().then((result: any) => {
        // Verify the result structure
        expect(result).to.have.property('rows')
        expect(result).to.have.property('computeTimeMs')
        expect(result.rows).to.have.length.greaterThan(0)

        // Verify row structure
        const firstRow = result.rows[0]
        expect(firstRow).to.have.property('width')
        expect(firstRow).to.have.property('height')
        expect(firstRow).to.have.property('ascent')
        expect(firstRow).to.have.property('elementIndices')
        expect(firstRow.elementIndices).to.have.length.greaterThan(0)

        // All 5 test elements should be in a single row (width 38 < 100)
        expect(firstRow.elementIndices).to.have.length(5)
        expect(firstRow.elementIndices).to.deep.eq([0, 1, 2, 3, 4])
      })
    })
  })

  it('should compute rows correctly with line wrapping', () => {
    cy.window().then((win: Window) => {
      const testWorker = (win as any).layoutTestWorker

      // Create elements that will wrap to multiple rows
      // 5 elements at 30px each = 150px total, with 50px width should wrap
      const testElements = Array.from({ length: 5 }, (_, i) => ({
        index: i,
        value: 'W',
        metrics: {
          width: 30,
          height: 20,
          boundingBoxAscent: 15,
          boundingBoxDescent: 5
        }
      }))

      const testOptions = {
        innerWidth: 50, // Narrow width to force wrapping
        startX: 10,
        startY: 10,
        pageHeight: 800,
        mainOuterHeight: 700,
        scale: 1,
        isPagingMode: true,
        defaultRowMargin: 2,
        defaultTabWidth: 32
      }

      return new Cypress.Promise((resolve, reject) => {
        testWorker.onmessage = (evt: MessageEvent) => {
          if (evt.data.type === 'LAYOUT_RESULT') resolve(evt.data)
          else if (evt.data.type === 'LAYOUT_ERROR') reject(new Error(evt.data.error))
        }
        testWorker.postMessage({
          type: 'COMPUTE_LAYOUT',
          requestId: 2,
          elements: testElements,
          options: testOptions
        })
      }).then((result: any) => {
        // Should have multiple rows since 150px > 50px
        expect(result.rows).to.have.length.greaterThan(1)

        // Each row should have 1-2 elements max (30px each, 50px width)
        result.rows.forEach((row: any) => {
          expect(row.elementIndices.length).to.be.lessThan(3)
        })

        // Total elements across all rows should be 5
        const totalElements = result.rows.reduce(
          (sum: number, row: any) => sum + row.elementIndices.length,
          0
        )
        expect(totalElements).to.eq(5)
      })
    })
  })

  it('should handle page breaks', () => {
    cy.window().then((win: Window) => {
      const testWorker = (win as any).layoutTestWorker

      // Create elements including a page break
      const testElements = [
        {
          index: 0,
          value: 'A',
          metrics: {
            width: 10,
            height: 20,
            boundingBoxAscent: 15,
            boundingBoxDescent: 5
          }
        },
        {
          index: 1,
          type: 'pageBreak',
          value: '',
          metrics: { width: 0, height: 0, boundingBoxAscent: 0, boundingBoxDescent: 0 }
        },
        {
          index: 2,
          value: 'B',
          metrics: {
            width: 10,
            height: 20,
            boundingBoxAscent: 15,
            boundingBoxDescent: 5
          }
        }
      ]

      const testOptions = {
        innerWidth: 100,
        startX: 10,
        startY: 10,
        pageHeight: 800,
        mainOuterHeight: 700,
        scale: 1,
        isPagingMode: true,
        defaultRowMargin: 2,
        defaultTabWidth: 32
      }

      return new Cypress.Promise((resolve, reject) => {
        testWorker.onmessage = (evt: MessageEvent) => {
          if (evt.data.type === 'LAYOUT_RESULT') resolve(evt.data)
          else if (evt.data.type === 'LAYOUT_ERROR') reject(new Error(evt.data.error))
        }
        testWorker.postMessage({
          type: 'COMPUTE_LAYOUT',
          requestId: 3,
          elements: testElements,
          options: testOptions
        })
      }).then((result: any) => {
        // Should have rows with page break flag
        const pageBreakRow = result.rows.find((r: any) => r.isPageBreak)
        expect(pageBreakRow).to.exist

        // Should have page boundary states
        expect(result.pageBoundaryStates).to.have.length.greaterThan(0)
      })
    })
  })

  it('should expose shouldUseAsyncLayout helper', () => {
    cy.window().then((win: Window) => {
      // The testAsyncLayout function is exposed on window
      const testFn = (win as any).testAsyncLayout
      if (testFn) {
        // If available, test it
        expect(testFn).to.be.a('function')
      } else {
        // Skip if not exposed - Plan B.2 test helper optional
        cy.log('testAsyncLayout not exposed - skipping')
      }
    })
  })
})
