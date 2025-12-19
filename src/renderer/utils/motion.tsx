// src/renderer/utils/motion.tsx
import { motion, MotionProps } from 'framer-motion';
import { useAnimation } from '../context/AnimationContext';
import { HTMLAttributes, forwardRef } from 'react';

type DivProps = HTMLAttributes<HTMLDivElement>;
type MotionDivProps = MotionProps & DivProps;

export const MotionDiv = forwardRef<HTMLDivElement, MotionDivProps>(
  ({ animate, initial, exit, transition, variants, whileHover, whileTap, ...rest }, ref) => {
    const { animationsEnabled } = useAnimation();
    if (!animationsEnabled) {
      return <div {...rest} ref={ref} />;
    }

    return (
      <motion.div
        initial={initial}
        animate={animate}
        exit={exit}
        transition={transition}
        variants={variants}
        whileHover={whileHover}
        whileTap={whileTap}
        {...rest}
        ref={ref}
      />
    );
  }
);

MotionDiv.displayName = 'MotionDiv';
export const MotionButton = motion.button;
export const MotionSpan = motion.span;
export const MotionSection = motion.section;