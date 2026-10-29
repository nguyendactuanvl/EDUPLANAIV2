import React from 'react';
import { OMRScannerView as BaseOMRScannerView } from './ExamShuffler/OMRScannerView';
import { OMRExamKey } from '../services/omrScannerService';

export interface OmrScannerViewProps {
  initialExamKeys?: Record<string, OMRExamKey>;
  onBackToShuffle?: () => void;
}

export const OmrScannerView: React.FC<OmrScannerViewProps> = (props) => {
  return <BaseOMRScannerView {...props} />;
};

export const OMRScannerView = OmrScannerView;
export default OmrScannerView;
