import React, { useState } from 'react';
import { Pie } from '@visx/shape';
import { scaleOrdinal } from '@visx/scale';
import { Group } from '@visx/group';
import { GradientPinkBlue } from '@visx/gradient';
import { animated, useTransition, to } from '@react-spring/web';

const defaultMargin = { top: 20, right: 20, bottom: 20, left: 20 };

export const DoubleDonutChart = ({
  width,
  height,
  outerData,
  innerData,
  margin = defaultMargin,
  animate = true,
  formatOuterLabel = (v) => v,
  formatInnerLabel = (v) => v,
  outerColorRange,
  innerColorRange,
  outerTitle = 'Externo',
  innerTitle = 'Interno',
}) => {
  const [selectedOuter, setSelectedOuter] = useState(null);
  const [selectedInner, setSelectedInner] = useState(null);

  if (width < 10) return null;

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const radius = Math.min(innerWidth, innerHeight) / 2;
  const centerY = innerHeight / 2;
  const centerX = innerWidth / 2;
  const donutThickness = 50;

  // Extrair domínios de cores
  const outerNames = outerData.map(d => d.label);
  const innerNames = innerData.map(d => d.label);

  const defaultOuterRange = [
    'rgba(255,255,255,0.7)',
    'rgba(255,255,255,0.6)',
    'rgba(255,255,255,0.5)',
    'rgba(255,255,255,0.4)',
    'rgba(255,255,255,0.3)',
    'rgba(255,255,255,0.2)',
    'rgba(255,255,255,0.1)',
  ];

  const defaultInnerRange = [
    'rgba(93,30,91,1)',
    'rgba(93,30,91,0.8)',
    'rgba(93,30,91,0.6)',
    'rgba(93,30,91,0.4)'
  ];

  const getOuterColor = scaleOrdinal({
    domain: outerNames,
    range: outerColorRange || defaultOuterRange,
  });
  
  const getInnerColor = scaleOrdinal({
    domain: innerNames,
    range: innerColorRange || defaultInnerRange,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', width: '100%' }}>
      {/* Legendas no canto superior direito */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 2,
        padding: '4px 8px',
        background: 'rgba(0,0,0,0.25)',
        borderRadius: '10px',
        backdropFilter: 'blur(4px)',
        maxWidth: '160px',
      }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          {outerTitle}
        </div>
        {outerData.map((d) => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: getOuterColor(d.label), flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#f0f0f0', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.label}</span>
          </div>
        ))}
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
          {innerTitle}
        </div>
        {innerData.map((d) => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: getInnerColor(d.label), flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#f0f0f0', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.label}</span>
          </div>
        ))}
      </div>

      <svg width={width} height={height - 20}>
      <Group top={centerY + margin.top} left={centerX + margin.left}>
        <Pie
          data={
            selectedOuter ? outerData.filter(({ label }) => label === selectedOuter) : outerData
          }
          pieValue={(d) => d.value}
          outerRadius={radius}
          innerRadius={radius - donutThickness}
          cornerRadius={3}
          padAngle={0.005}
          pieSortValues={null}
        >
          {(pie) => (
            <AnimatedPie
              {...pie}
              animate={animate}
              getKey={(arc) => arc.data.label}
              onClickDatum={({ data: { label } }) =>
                animate &&
                setSelectedOuter(selectedOuter && selectedOuter === label ? null : label)
              }
              getColor={(arc) => getOuterColor(arc.data.label)}
              formatLabel={(arc) => formatOuterLabel(arc.data.value, selectedOuter === arc.data.label)}
            />
          )}
        </Pie>
        <Pie
          data={
            selectedInner ? innerData.filter(({ label }) => label === selectedInner) : innerData
          }
          pieValue={(d) => d.value}
          pieSortValues={null}
          outerRadius={radius - donutThickness * 1.3}
        >
          {(pie) => (
            <AnimatedPie
              {...pie}
              animate={animate}
              getKey={(arc) => arc.data.label}
              onClickDatum={({ data: { label } }) =>
                animate &&
                setSelectedInner(selectedInner && selectedInner === label ? null : label)
              }
              getColor={(arc) => getInnerColor(arc.data.label)}
              formatLabel={(arc) => formatInnerLabel(arc.data.value, selectedInner === arc.data.label)}
            />
          )}
        </Pie>
      </Group>
      {animate && (
        <text
          textAnchor="end"
          x={width - 16}
          y={height - 16}
          fill="white"
          fontSize={11}
          fontWeight={300}
          pointerEvents="none"
        >
          Clique nos segmentos para isolar
        </text>
      )}
      </svg>
    </div>
  );
};

const fromLeaveTransition = ({ endAngle }) => ({
  startAngle: endAngle > Math.PI ? 2 * Math.PI : 0,
  endAngle: endAngle > Math.PI ? 2 * Math.PI : 0,
  opacity: 0,
});

const enterUpdateTransition = ({ startAngle, endAngle }) => ({
  startAngle,
  endAngle,
  opacity: 1,
});

function AnimatedPie({ animate, arcs, path, getKey, getColor, onClickDatum, formatLabel }) {
  const transitions = useTransition(arcs, {
    from: animate ? fromLeaveTransition : enterUpdateTransition,
    enter: enterUpdateTransition,
    update: enterUpdateTransition,
    leave: animate ? fromLeaveTransition : enterUpdateTransition,
    keys: getKey,
  });
  
  return transitions((props, arc, { key }) => {
    const [centroidX, centroidY] = path.centroid(arc);
    const hasSpaceForLabel = arc.endAngle - arc.startAngle >= 0.1;

    return (
      <g key={key}>
        <animated.path
          d={to([props.startAngle, props.endAngle], (startAngle, endAngle) =>
            path({
              ...arc,
              startAngle,
              endAngle,
            }),
          )}
          fill={getColor(arc)}
          onClick={() => onClickDatum(arc)}
          onTouchStart={() => onClickDatum(arc)}
          style={{ cursor: 'pointer' }}
        />
        {hasSpaceForLabel && (
          <animated.g style={{ opacity: props.opacity }}>
            <text
              fill="white"
              x={centroidX}
              y={centroidY}
              dy=".33em"
              fontSize={16}
              fontWeight="bold"
              textAnchor="middle"
              pointerEvents="none"
            >
              {formatLabel ? formatLabel(arc) : getKey(arc)}
            </text>
          </animated.g>
        )}
      </g>
    );
  });
}
