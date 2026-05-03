/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { SimulationNodeDatum, SimulationLinkDatum } from 'd3';

export enum ViewMode {
  HOME = 'HOME',
  REPO_ANALYZER = 'REPO_ANALYZER',
  ARTICLE_INFOGRAPHIC = 'ARTICLE_INFOGRAPHIC',
  DEV_STUDIO = 'DEV_STUDIO'
}

export interface D3Node extends SimulationNodeDatum {
  id: string;
  group: number;
  label: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface D3Link extends SimulationLinkDatum<D3Node> {
  source: string | D3Node;
  target: string | D3Node;
  value: number;
}

export interface DataFlowGraph {
  nodes: D3Node[];
  links: D3Link[];
}

export interface RepoFileTree {
  path: string;
  type: string;
}

export interface RepoAnalysis {
  features: {
    title: string;
    description: string;
    priority: 'High' | 'Medium' | 'Low';
  }[];
  gaps: {
    title: string;
    description: string;
    impact: string;
  }[];
  roadmap: {
    phase: string;
    tasks: string[];
  }[];
  guide: {
    title: string;
    content: string;
  }[];
}

export interface DevStudioState {
  repoName: string;
  fileTree: RepoFileTree[];
  graphData: DataFlowGraph;
  analysis?: RepoAnalysis;
}

export interface Citation {
    uri: string;
    title: string;
}

export interface RepoHistoryItem {
  id: string;
  repoName: string;
  imageData: string;
  is3D: boolean;
  style: string;
  date: Date;
}

export interface ArticleHistoryItem {
    id: string;
    title: string;
    url: string;
    imageData: string;
    citations: Citation[];
    date: Date;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}
