import type { ComponentChildren } from 'preact'
import type { IconName } from '../Icon/Icon'
import { ICONS } from '../Icon/Icon'
import {
  ARMS, EARS, EYES, FRAME_CENTRE, HEAD, HOVER, LINE_WIDTH, NECK, OPACITY, SHIELD, SPRING, SPRING_WIDTH, THRUST, THRUSTER, TORSO, VISOR,
} from './geometry'

/** idle: arms down. active: arms raised, thrusters firing. rest: small shadow, dimmed emblem. */
export type RobotPose = 'idle' | 'active' | 'rest'

/** Where an arm points; `raised` is the pose's working arm. */
export type RobotArm = 'down' | 'raised' | 'out' | 'up'

export interface RobotProps {
  pose: RobotPose
  /** What shows on the visor. */
  face: ComponentChildren
  /** The chest "Icon" layer: a library icon, sized and centred on the shield as Figma places it. */
  emblem: { icon: IconName; size: number; cy: number }
  /** Bot Scene: set an arm by hand instead of following the pose. */
  arms?: { left?: RobotArm; right?: RobotArm }
  /** Bot Scene: lift the head by this much, on a spring. */
  lift?: number
}

/** The hover robot every agent and UX AI share. Painted by BotAvatar.css. */
export function Robot({ pose, face, emblem, arms, lift = 0 }: RobotProps) {
  const active = pose === 'active'
  const rest = pose === 'rest'
  return (
    <>
      <ellipse
        class="bb-bot-avatar__hover"
        cx={HOVER.cx} cy={HOVER.cy} rx={rest ? HOVER.restRx : HOVER.rx} ry={HOVER.ry}
        opacity={rest ? OPACITY.hoverRest : OPACITY.hover}
      />
      <g class="bb-bot-avatar__figure">
        <rect class="bb-bot-avatar__thruster" {...THRUSTER} />
        {active && <path class="bb-bot-avatar__thrust" d={THRUST} stroke-width={LINE_WIDTH} />}
        {ARMS.map(({ raised, out, up, ...arm }, i) => {
          const armPose = (i === 0 ? arms?.left : arms?.right) ?? (active ? 'raised' : 'down')
          return (
            <g key={arm.x} transform={{ down: undefined, raised, out, up }[armPose]}>
              <rect class="bb-bot-avatar__arm" {...arm} opacity={OPACITY.limb} />
            </g>
          )
        })}
        {lift ? <path class="bb-bot-avatar__spring" d={SPRING} stroke-width={SPRING_WIDTH} /> : <rect class="bb-bot-avatar__neck" {...NECK} opacity={OPACITY.neck} />}
        <g transform={lift ? `translate(0 ${-lift})` : undefined}>
          {EARS.map((ear) => <rect key={ear.x} class="bb-bot-avatar__ear" {...ear} opacity={OPACITY.limb} />)}
          <rect class="bb-bot-avatar__head" {...HEAD} />
          <rect class="bb-bot-avatar__visor" x={VISOR.x} y={VISOR.y} width={VISOR.width} height={VISOR.height} rx={VISOR.rx} stroke-width={VISOR.strokeWidth} />
          {face}
        </g>
        <rect class="bb-bot-avatar__torso" {...TORSO} />
        <g class="bb-bot-avatar__emblem" opacity={rest ? OPACITY.emblemRest : undefined}>
          <path class="bb-bot-avatar__shield" d={SHIELD} />
          <EmblemIcon {...emblem} />
        </g>
      </g>
    </>
  )
}

/** Two upright eyes, the robot's ready face. */
export function RobotEyes() {
  return <g class="bb-bot-avatar__eyes">{EYES.map((eye) => <rect key={eye.x} class="bb-bot-avatar__eye" {...eye} />)}</g>
}

/** The same library glyph <Icon> draws, placed in the robot's own 40-unit frame. */
function EmblemIcon({ icon, size, cy }: RobotProps['emblem']) {
  const glyph = ICONS[icon]
  if (!glyph) return null // not shipped in this bundle (see Icon/generated.active.ts)
  return (
    <svg
      class="bb-bot-avatar__icon"
      data-icon={icon}
      x={FRAME_CENTRE - size / 2}
      y={cy - size / 2}
      width={size}
      height={size}
      viewBox={glyph.viewBox}
      fill="none"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: glyph.body }}
    />
  )
}
