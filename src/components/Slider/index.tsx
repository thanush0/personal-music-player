import { useRef, useCallback, MouseEvent } from 'react';

enum Direction {
  HORIZONTAL = 'HORIZONTAL',
  VERTICAL = 'VERTICAL',
}

const SliderBar = ({
  value,
  style,
  className,
}: {
  value: number;
  style?: React.CSSProperties;
  className: string;
  direction: Direction;
}) => (
  <div
    className={className}
    style={Object.assign(
      {},
      {
        position: 'absolute',
        borderRadius: 4,
      },
      {
        top: 0,
        bottom: 0,
        left: 0,
        width: `${value * 100}%`,
      },
      style
    )}
  />
);

const SliderHandle = ({
  value,
  style,
  className,
}: {
  value: number;
  style?: React.CSSProperties;
  className: string;
  direction: Direction;
}) => (
  <div
    className={className}
    style={Object.assign(
      {},
      {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: '100%',
        transform: 'scale(1)',
        transition: 'transform 0.2s',
      },
      {
        top: 0,
        left: `${value * 100}%`,
        marginTop: -3,
        marginLeft: -8,
      },
      style
    )}
  />
);

// Simple slider component to replace react-player-controls
const SimpleSlider = ({
  isEnabled,
  direction,
  className,
  style,
  children,
  onChange,
  onChangeStart,
  onChangeEnd,
}: {
  isEnabled: boolean;
  direction: Direction;
  className: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  onChange: (value: number) => void;
  onChangeStart?: () => void;
  onChangeEnd?: (value: number) => void;
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const calculateValue = useCallback((clientX: number) => {
    if (!sliderRef.current) return 0;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const value = Math.max(0, Math.min(1, x / rect.width));
    
    return value;
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!isEnabled) return;
    
    isDragging.current = true;
    if (onChangeStart) onChangeStart();
    
    const value = calculateValue(e.clientX);
    onChange(value);

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!isDragging.current) return;
      const value = calculateValue(e.clientX);
      onChange(value);
    };

    const handleMouseUp = (e: globalThis.MouseEvent) => {
      isDragging.current = false;
      const value = calculateValue(e.clientX);
      if (onChangeEnd) onChangeEnd(value);
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isEnabled, onChange, onChangeStart, onChangeEnd, calculateValue]);

  return (
    <div
      ref={sliderRef}
      className={className}
      style={{ ...style, position: 'relative', height: '4px' }}
      onMouseDown={handleMouseDown}
    >
      {children}
    </div>
  );
};

export { Direction };

export const Slider = ({
  isEnabled,
  direction = Direction.HORIZONTAL,
  value,
  ...props
}: {
  isEnabled: boolean;
  direction?: Direction;
  value: number;
  onChangeStart?: () => void;
  onChange: (value: number) => void;
  onChangeEnd?: (value: number) => void;
}) => {
  return (
    <div className='volume-sider-container'>
      <SimpleSlider
        isEnabled={isEnabled}
        direction={direction}
        className='volume-sider'
        style={{ cursor: 'pointer' }}
        {...props}
      >
        <SliderBar className='position-sider' direction={direction} value={value} />
        <SliderHandle className='handler-sider' direction={direction} value={value} />
      </SimpleSlider>
    </div>
  );
};
