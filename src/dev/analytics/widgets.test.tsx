import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/preact'
import { SortableTable, initials, searchRows, sortRows, toCsv, type Column } from './widgets'

interface Row { name: string; hours: number }
const rows: Row[] = [{ name: 'Asha Rao', hours: 7.4 }, { name: 'Ben Ortiz', hours: 12 }, { name: 'Chloe Martin', hours: 3.1 }]
const columns: readonly Column<Row>[] = [
  { key: 'name', label: 'Name', value: (r) => r.name },
  { key: 'hours', label: 'Hours', value: (r) => r.hours, numeric: true },
]

describe('table helpers', () => {
  it('sorts by number or text in either direction', () => {
    expect(sortRows(rows, columns, { key: 'hours', dir: 'desc' }).map((r) => r.name)).toEqual(['Ben Ortiz', 'Asha Rao', 'Chloe Martin'])
    expect(sortRows(rows, columns, { key: 'name', dir: 'asc' }).map((r) => r.name)).toEqual(['Asha Rao', 'Ben Ortiz', 'Chloe Martin'])
    expect(sortRows(rows, columns, null)).toEqual(rows)
  })

  it('searches every searchable column, case-insensitively', () => {
    expect(searchRows(rows, columns, 'chlo').map((r) => r.name)).toEqual(['Chloe Martin'])
    expect(searchRows(rows, columns, '12')).toHaveLength(1)
    expect(searchRows(rows, columns, '  ')).toHaveLength(3)
  })

  it('makes initials and quotes CSV cells that need it', () => {
    expect(initials('Chloe Martin')).toBe('CM')
    expect(toCsv(['Name', 'Note'], [['Asha', 'says "hi", twice']])).toBe('Name,Note\nAsha,"says ""hi"", twice"')
  })
})

describe('SortableTable', () => {
  it('sorts on heading click and flips on the second click', () => {
    render(<SortableTable caption="People" columns={columns} rows={rows} rowKey={(r) => r.name} />)
    const hours = screen.getByRole('columnheader', { name: /Hours/ })
    fireEvent.click(within(hours).getByRole('button'))
    expect(hours).toHaveAttribute('aria-sort', 'descending')
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Ben Ortiz')
    fireEvent.click(within(hours).getByRole('button'))
    expect(hours).toHaveAttribute('aria-sort', 'ascending')
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Chloe Martin')
  })

  it('shows the empty message when the search leaves nothing', () => {
    render(<SortableTable caption="People" columns={columns} rows={rows} rowKey={(r) => r.name} query="zz" empty="Nobody." />)
    expect(screen.getByText('Nobody.')).toBeInTheDocument()
  })
})
