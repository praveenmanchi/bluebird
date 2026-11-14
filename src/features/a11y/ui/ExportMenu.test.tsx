import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { ExportMenu } from './ExportMenu'

const open = () => fireEvent.click(screen.getByRole('button', { name: 'Export report' }))
const labels = () => screen.getAllByRole('option').map((o) => o.textContent)

describe('ExportMenu', () => {
  it('offers the downloads and the canvas documents', () => {
    render(<ExportMenu onExport={() => undefined} />)
    open()
    expect(labels()).toEqual(['JSON', 'Markdown', 'Figma report', 'Developer spec'])
  })

  it('leaves out the canvas documents in Dev Mode', () => {
    render(<ExportMenu onExport={() => undefined} canvas={false} />)
    open()
    expect(labels()).toEqual(['JSON', 'Markdown'])
  })
})
