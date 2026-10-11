import { useEffect } from 'preact/hooks'
import { useRpc } from '@shared/ui'
import { loadDetail } from '../actions'
import { selectedKey, tickets } from '../state'
import { TicketDetail } from './TicketDetail'
import { TicketList } from './TicketList'
import './jira.css'
import './JiraBoard.css'

export interface JiraBoardProps {
  /** Extra class on the root (host layout). */
  class?: string
}

/**
 * Figma "Jira board" (40000269:5322), the body of "Jira UI": the ticket list
 * beside the selected ticket's detail, split 30 / 70 (the mock's list is a fixed
 * 380). Below the container breakpoint the two panels stack. UI only — every
 * value comes from fixtures.
 */
export function JiraBoard({ class: cls }: JiraBoardProps = {}) {
  const rpc = useRpc()
  const selected = tickets.value.find((t) => t.key === selectedKey.value) ?? null
  // The search returns list fields only; comments, history, work log and links come per issue.
  useEffect(() => { if (selectedKey.value) void loadDetail(rpc, selectedKey.value) }, [selectedKey.value])
  return (
    <div class={`bb-jira-board ${cls ?? ''}`}>
      <div class="bb-jira-board__layout">
        <TicketList />
        {selected
          ? <TicketDetail key={selected.key} ticket={selected} />
          : <section class="bb-jira-board__detail bb-jira-board__detail--empty" aria-label="Ticket detail"><p class="bb-jira-board__empty">Select a ticket to see its detail.</p></section>}
      </div>
    </div>
  )
}
