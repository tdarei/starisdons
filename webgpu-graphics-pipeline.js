/**
 * WebGPU Graphics Pipeline
 * Provides WebGPU rendering capabilities for advanced graphics
 */

class WebGPUGraphicsPipeline {
    constructor() {
        this.device = null;
        this.context = null;
        this.commandEncoder = null;
        this.renderPass = null;
        this.initialized = false;
    }

    /**
     * Initialize WebGPU
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @returns {Promise<boolean>}
     */
    async initialize(canvas) {
        if (!this.isSupported()) {
            throw new Error('WebGPU is not supported in this browser');
        }

        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                throw new Error('No WebGPU adapter available');
            }

            this.device = await adapter.requestDevice();
            this.context = canvas.getContext('webgpu');
            
            if (!this.context) {
                throw new Error('Failed to get WebGPU context');
            }

            const swapChainFormat = navigator.gpu.getPreferredCanvasFormat();
            this.context.configure({
                device: this.device,
                format: swapChainFormat,
                usage: GPUTextureUsage.RENDER_ATTACHMENT,
            });

            this.initialized = true;
            return true;
        } catch (error) {
            throw new Error(`WebGPU initialization failed: ${error.message}`);
        }
    }

    /**
     * Check if WebGPU is supported
     * @returns {boolean}
     */
    isSupported() {
        return 'gpu' in navigator;
    }

    /**
     * Create a shader module
     * @param {string} code - Shader code
     * @returns {GPUShaderModule}
     */
    createShaderModule(code) {
        if (!this.device) {
            throw new Error('WebGPU device not initialized');
        }
        return this.device.createShaderModule({ code });
    }

    /**
     * Create a render pipeline
     * @param {Object} config - Pipeline configuration
     * @returns {GPURenderPipeline}
     */
    createRenderPipeline(config) {
        if (!this.device) {
            throw new Error('WebGPU device not initialized');
        }

        const pipelineDescriptor = {
            vertex: {
                module: config.vertexShader,
                entryPoint: config.vertexEntryPoint || 'main',
                buffers: config.vertexBuffers || []
            },
            fragment: {
                module: config.fragmentShader,
                entryPoint: config.fragmentEntryPoint || 'main',
                targets: config.targets || [{
                    format: navigator.gpu.getPreferredCanvasFormat()
                }]
            },
            primitive: config.primitive || {
                topology: 'triangle-list'
            },
            layout: config.layout || 'auto'
        };

        return this.device.createRenderPipeline(pipelineDescriptor);
    }

    /**
     * Create a buffer
     * @param {ArrayBuffer|ArrayBufferView} data - Buffer data
     * @param {number} usage - Buffer usage flags
     * @returns {GPUBuffer}
     */
    createBuffer(data, usage) {
        if (!this.device) {
            throw new Error('WebGPU device not initialized');
        }

        const buffer = this.device.createBuffer({
            size: data.byteLength,
            usage: usage
        });

        this.device.queue.writeBuffer(buffer, 0, data);
        return buffer;
    }

    /**
     * Create a texture
     * @param {Object} config - Texture configuration
     * @returns {GPUTexture}
     */
    createTexture(config) {
        if (!this.device) {
            throw new Error('WebGPU device not initialized');
        }

        return this.device.createTexture({
            size: config.size,
            format: config.format,
            usage: config.usage
        });
    }

    /**
     * Begin render pass
     * @param {Object} config - Render pass configuration
     */
    beginRenderPass(config) {
        if (!this.context) {
            throw new Error('WebGPU context not initialized');
        }

        this.commandEncoder = this.device.createCommandEncoder();
        
        const renderPassDescriptor = {
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                clearValue: config.clearValue || { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                loadOp: config.loadOp || 'clear',
                storeOp: 'store'
            }]
        };

        this.renderPass = this.commandEncoder.beginRenderPass(renderPassDescriptor);
    }

    /**
     * Set render pipeline
     * @param {GPURenderPipeline} pipeline - Render pipeline
     */
    setPipeline(pipeline) {
        if (!this.renderPass) {
            throw new Error('Render pass not started');
        }
        this.renderPass.setPipeline(pipeline);
    }

    /**
     * Set vertex buffer
     * @param {number} slot - Buffer slot
     * @param {GPUBuffer} buffer - Vertex buffer
     * @param {number} offset - Buffer offset
     */
    setVertexBuffer(slot, buffer, offset = 0) {
        if (!this.renderPass) {
            throw new Error('Render pass not started');
        }
        this.renderPass.setVertexBuffer(slot, buffer, offset);
    }

    /**
     * Draw
     * @param {number} vertexCount - Number of vertices
     * @param {number} instanceCount - Number of instances
     * @param {number} firstVertex - First vertex index
     * @param {number} firstInstance - First instance index
     */
    draw(vertexCount, instanceCount = 1, firstVertex = 0, firstInstance = 0) {
        if (!this.renderPass) {
            throw new Error('Render pass not started');
        }
        this.renderPass.draw(vertexCount, instanceCount, firstVertex, firstInstance);
    }

    /**
     * End render pass
     */
    endRenderPass() {
        if (!this.renderPass) {
            throw new Error('Render pass not started');
        }
        this.renderPass.end();
    }

    /**
     * Submit commands
     */
    submit() {
        if (!this.commandEncoder) {
            throw new Error('Command encoder not created');
        }

        const commandBuffer = this.commandEncoder.finish();
        this.device.queue.submit([commandBuffer]);
        
        this.commandEncoder = null;
        this.renderPass = null;
    }

    /**
     * Create bind group
     * @param {Object} config - Bind group configuration
     * @returns {GPUBindGroup}
     */
    createBindGroup(config) {
        if (!this.device) {
            throw new Error('WebGPU device not initialized');
        }

        return this.device.createBindGroup({
            layout: config.layout,
            entries: config.entries
        });
    }

    /**
     * Get device
     * @returns {GPUDevice}
     */
    getDevice() {
        return this.device;
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.device) {
            this.device.destroy();
            this.device = null;
        }
        this.context = null;
        this.initialized = false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebGPUGraphicsPipeline;
}

