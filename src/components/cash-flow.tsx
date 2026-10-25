'use client';
import { useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  Landmark,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import { currency, FinancialState } from '@/lib/model';
import { financialSummary } from '@/lib/finance';
import { useFinance } from '@/lib/client-store';
type FlowData = {
  label: string;
  amount: number;
  tone: string;
  detail: string;
  icon: string;
  onClick?: () => void;
};
type MoneyNode = Node<FlowData>;
const icons = {
  income: ArrowDownLeft,
  essential: ArrowUpRight,
  goals: Target,
  investments: Landmark,
  emergency: ShieldCheck,
  discretionary: Sparkles,
  main: CircleDollarSign,
};
function Bubble({ data, id }: NodeProps<MoneyNode>) {
  const highlighted = useFinance((s) => s.highlightedNode === id);
  const Icon = icons[data.icon as keyof typeof icons] || CircleDollarSign;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={data.onClick}
      onKeyDown={(e) => e.key === 'Enter' && data.onClick?.()}
      className={`flow-bubble ${data.tone}${highlighted ? ' is-highlighted' : ''}`}
    >
      <Handle type="target" position={Position.Left} />
      <span className="bubble-icon">
        <Icon size={15} />
      </span>
      <div>
        <span className="bubble-label">{data.label}</span>
        <strong>{currency(data.amount)}</strong>
        <span className="bubble-detail">{data.detail}</span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = { money: Bubble };
export function CashFlow({
  state,
  compact = false,
  projected = false,
  onEdit,
}: {
  state: FinancialState;
  compact?: boolean;
  projected?: boolean;
  onEdit: (id: string) => void;
}) {
  const summary = financialSummary(state),
    multiplier = projected ? 3 : 1;
  const initial = useMemo(() => {
    const rows = [
      {
        id: 'essentials',
        label: 'Essentials',
        amount: summary.essentials + state.debtPayment,
        tone: 'red',
        icon: 'essential',
        detail: 'Your everyday foundation',
      },
      {
        id: 'goals',
        label: 'Goal savings',
        amount: summary.goals,
        tone: 'blue',
        icon: 'goals',
        detail: `${state.goals.length} things to look forward to`,
      },
      {
        id: 'investments',
        label: 'Investments',
        amount: state.investments,
        tone: 'blue',
        icon: 'investments',
        detail: 'Growing your future',
      },
      {
        id: 'emergencyContribution',
        label: 'Emergency fund',
        amount: state.emergencyContribution,
        tone: 'blue',
        icon: 'emergency',
        detail: 'A little peace of mind',
      },
      {
        id: 'discretionary',
        label: 'Guilt-free spending',
        amount: summary.guiltFree,
        tone: 'teal',
        icon: 'discretionary',
        detail: 'Yours to enjoy',
      },
    ];
    const nodes: MoneyNode[] = [
      ...state.income.map((i, index) => ({
        id: i.id,
        type: 'money',
        position: { x: 0, y: 135 + index * 130 },
        data: {
          label: i.name,
          amount: i.amount * multiplier,
          tone: 'green',
          detail: `Monthly · paid on the ${i.payday}${i.payday === 1 ? 'st' : 'th'}`,
          icon: 'income',
          onClick: () => onEdit(i.id),
        },
      })),
      {
        id: 'income',
        type: 'money',
        position: { x: 300, y: 200 },
        data: {
          label: projected ? 'Projected income' : 'Monthly income',
          amount: summary.income * multiplier,
          tone: 'green main-bubble',
          detail: projected ? 'Next 3 months · planned' : 'Every dollar has a direction',
          icon: 'main',
          onClick: () => onEdit('income'),
        },
      },
      ...rows.map((r, i) => ({
        id: r.id,
        type: 'money',
        position: { x: 640, y: i * 106 },
        data: { ...r, amount: r.amount * multiplier, onClick: () => onEdit(r.id) },
      })),
    ];
    return {
      nodes,
      edges: [
        ...state.income.map((i) => ({
          id: `${i.id}-income`,
          source: i.id,
          target: 'income',
          animated: true,
          style: { stroke: '#70bda0', strokeWidth: 1.5, opacity: 0.6 },
        })),
        ...rows.map((r) => ({
          id: `income-${r.id}`,
          source: 'income',
          target: r.id,
          animated: true,
          style: {
            stroke: r.tone === 'red' ? '#c57b79' : r.tone === 'blue' ? '#7c9bc3' : '#b9db9a',
            strokeWidth: 1.5,
            opacity: 0.6,
          },
        })),
      ],
    };
  }, [
    state,
    multiplier,
    summary.essentials,
    summary.goals,
    summary.guiltFree,
    summary.income,
    onEdit,
    projected,
  ]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  useEffect(() => {
    setNodes((previous) =>
      initial.nodes.map((n) => ({
        ...n,
        position: previous.find((p) => p.id === n.id)?.position ?? n.position,
      })),
    );
    setEdges(initial.edges);
  }, [initial, setNodes, setEdges]);
  return (
    <div className={compact ? 'flow-container compact' : 'flow-container'}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: compact ? 0.13 : 0.2 }}
        minZoom={0.3}
        maxZoom={1.6}
        nodesConnectable={false}
        colorMode="dark"
        preventScrolling={!compact}
      >
        <Background color="#303733" gap={24} size={1} />
        {!compact && <Controls showInteractive={false} />}
      </ReactFlow>
    </div>
  );
}
