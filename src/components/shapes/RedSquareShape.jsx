import { BaseBoxShapeUtil, HTMLContainer } from 'tldraw';
import React from 'react';

export class RedSquareShapeUtil extends BaseBoxShapeUtil {
    static type = 'red_square';

    getDefaultProps() {
        return {
            w: 100,
            h: 100,
        };
    }

    component(shape) {
        return (
            <HTMLContainer style={{ pointerEvents: 'all' }}>
                <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'red',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                    // 关键: 允许冒泡，这样才能让 Tldraw 捕获拖拽事件
                }}>
                    Hello
                </div>
            </HTMLContainer>
        );
    }

    indicator(shape) {
        return <rect width={shape.props.w} height={shape.props.h} />;
    }
}
