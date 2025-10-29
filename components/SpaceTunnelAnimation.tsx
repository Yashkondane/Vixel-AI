/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

const SpaceTunnelAnimation: React.FC = () => {
    return (
        <div className="space-tunnel-container">
            <div className="space-tunnel">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="cube-frame"></div>
                ))}
            </div>
        </div>
    );
};

export default SpaceTunnelAnimation;
