// How a finding was decided. A measured ratio and a guess read off a layer name
// are not the same claim, and a reader has to be able to tell them apart.
// Pure: derived from what the scan already reports, so it works on old results too.
import type { ContrastIssue, NonTextIssue, TargetSizeIssue } from './messages'

export type Confidence = 'measured' | 'inferred' | 'assumed'

export const CONFIDENCE_LABEL: Readonly<Record<Confidence, string>> = {
  measured: 'Measured',
  inferred: 'Inferred from the layer name',
  assumed: 'Measured against an assumed background',
}

/** The sentence the card and the report put under the label. */
export const CONFIDENCE_DETAIL: Readonly<Record<Confidence, string>> = {
  measured: 'Every colour and size here was read from the file.',
  inferred: 'Figma does not say this layer is a control — its name does. Check that it is one.',
  assumed: 'Nothing opaque sits behind it, so the ratio is against an assumed white page.',
}

export const contrastConfidence = (issue: Pick<ContrastIssue, 'assumedBackground'>): Confidence =>
  (issue.assumedBackground ? 'assumed' : 'measured')

/** A stroke proved interactive by a prototype reaction is measured; one judged by its name is not. */
export const nonTextConfidence = (issue: Pick<NonTextIssue, 'evidence'>): Confidence =>
  (issue.evidence === 'reaction' ? 'measured' : 'inferred')

export const targetConfidence = (issue: Pick<TargetSizeIssue, 'evidence'>): Confidence =>
  (issue.evidence === 'reaction' ? 'measured' : 'inferred')

/** One line for the card's "Decided by" row: terse when it was measured, explained when it was not. */
export const confidenceLine = (confidence: Confidence): string =>
  (confidence === 'measured' ? CONFIDENCE_LABEL[confidence] : `${CONFIDENCE_LABEL[confidence]} — ${CONFIDENCE_DETAIL[confidence]}`)
