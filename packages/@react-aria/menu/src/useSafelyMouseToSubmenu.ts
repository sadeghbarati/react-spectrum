import {CSSProperties, RefObject, useEffect, useRef, useState} from 'react';
import {useResizeObserver} from '@react-aria/utils';

interface SafelyMouseToSubmenuOptions {
  /** Ref for the submenu. */
  submenuRef: RefObject<Element>,
  /** Whether the submenu is open. */
  isOpen: boolean
}

const ALLOWED_INVALID_MOVEMENTS = 2;
const THROTTLE_TIME = 50;
const TIMEOUT_TIME = 1000;
const ANGLE_PADDING = Math.PI / 12; // 15°

/**
 * Allows the user to move their pointer to the submenu without it closing when their mouse leaves the trigger element.
 * Prevents pointer events from going to the underlying menu if the user is moving their pointer towards the sub-menu.
 */
export function useSafelyMouseToSubmenu(options: SafelyMouseToSubmenuOptions): CSSProperties {
  let {submenuRef, isOpen} = options;
  let prevPointerPos = useRef<{x: number, y: number}>(null);
  let submenuRect = useRef<DOMRect>(null);
  let lastProcessedTime = useRef<number>(0);
  let timeout = useRef(null);
  let submenuSide = useRef(null);

  // Keep track of the last few pointer movements, where true = moving towards submenu, false = moving away from submenu.
  let [movements, setMovements] = useState<Array<boolean>>([]);

  let updateSubmenuRect = () => {
    if (submenuRef.current) {
      submenuRect.current = submenuRef.current.getBoundingClientRect();
      submenuSide.current = null;
    }
  };

  useResizeObserver({ref: submenuRef, onResize: updateSubmenuRect});

  useEffect(() => {
    let submenu = submenuRef.current;

    if (!submenu || !isOpen) {
      setMovements([]);
      return;
    }

    submenuRect.current = submenu.getBoundingClientRect();

    let onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        return;
      }

      let currentTime = Date.now();

      // Throttle
      if (currentTime - lastProcessedTime.current < THROTTLE_TIME) {
        return;
      }

      let {clientX: mouseX, clientY: mouseY} = e;
      
      if (!submenuSide.current) {
        submenuSide.current = mouseX > submenuRect.current.right ? 'left' : 'right';
      }

      if (!prevPointerPos.current) {
        prevPointerPos.current = {x: mouseX, y: mouseY};
        return;
      }

      if (!submenuRect.current) {
        return;
      }
    
      /* Check if pointer is moving towards submenu.
        Uses the 2-argument arctangent (https://en.wikipedia.org/wiki/Atan2) to calculate:
          - angle between previous pointer and top of submenu
          - angle between previous pointer and bottom of submenu
          - angle between previous pointer and current pointer (delta)
        If the pointer delta angle value is between the top and bottom angle values, we know the pointer is moving towards the submenu.
      */
      let prevMouseX = prevPointerPos.current.x;
      let prevMouseY = prevPointerPos.current.y;
      let toSubmenuX = submenuSide.current === 'right' ? submenuRect.current.left - prevMouseX : prevMouseX - submenuRect.current.right;
      let angleTop = Math.atan2(prevMouseY - submenuRect.current.top, toSubmenuX) + ANGLE_PADDING;
      let angleBottom = Math.atan2(prevMouseY - submenuRect.current.bottom, toSubmenuX) - ANGLE_PADDING;
      let anglePointer = Math.atan2(prevMouseY - mouseY, (submenuSide.current === 'left' ? -(mouseX - prevMouseX) : mouseX - prevMouseX));
      let isMovingTowardsSubmenu = anglePointer < angleTop && anglePointer > angleBottom;
      setMovements((prevMovements) => [...prevMovements, isMovingTowardsSubmenu].slice(-(ALLOWED_INVALID_MOVEMENTS + 1)));

      lastProcessedTime.current = currentTime;
      prevPointerPos.current = {x: mouseX, y: mouseY};

      // If the pointer is moving towards the submenu, start a timeout to close if no other movements are made after 500ms.
      clearTimeout(timeout.current);
      if (isMovingTowardsSubmenu) {
        timeout.current = setTimeout(() => {
          setMovements([]);
          setTimeout(() => {
            // Fire a pointerover event to trigger the menu to close.
            // Wait until pointer-events:none is no longer applied
            let target = document.elementFromPoint(mouseX, mouseY);
            target.dispatchEvent(new PointerEvent('pointerover', {bubbles: true, cancelable: true}));
          }, 100);
        }, TIMEOUT_TIME);
      }
    };

    window.addEventListener('pointermove', onPointerMove);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      clearTimeout(timeout.current);
    };

  }, [isOpen, submenuRef]);
  
  return {
    pointerEvents: movements.length < (ALLOWED_INVALID_MOVEMENTS + 1) || movements.every((m) => m === false) ? undefined : 'none'
  };
}