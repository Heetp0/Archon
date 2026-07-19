package com.archon.notes.canvas

import androidx.ink.brush.Brush
import androidx.ink.brush.InputToolType
import androidx.ink.brush.StockBrushes
import androidx.ink.strokes.ImmutableStrokeInputBatch
import androidx.ink.strokes.MutableStrokeInputBatch
import androidx.ink.strokes.Stroke
import java.nio.ByteBuffer
import java.nio.ByteOrder

object StrokeSerialization {

    fun serialize(strokes: List<Stroke>): ByteArray {
        val out = java.io.ByteArrayOutputStream()
        
        val header = ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN)
        header.putInt(strokes.size)
        out.write(header.array())

        for (stroke in strokes) {
            val inputs = stroke.inputs
            val n = inputs.size
            val inputsLen = 4 + n * 24

            val strokeHeader = ByteBuffer.allocate(4 + 4).order(ByteOrder.LITTLE_ENDIAN)
            strokeHeader.putInt(inputsLen)
            strokeHeader.putInt(n)
            out.write(strokeHeader.array())

            val pointsBuffer = ByteBuffer.allocate(n * 24).order(ByteOrder.LITTLE_ENDIAN)
            for (i in 0 until n) {
                val input = inputs[i]
                pointsBuffer.putFloat(input.x)
                pointsBuffer.putFloat(input.y)
                pointsBuffer.putFloat(input.elapsedTimeMillis.toFloat())
                pointsBuffer.putFloat(input.pressure)
                pointsBuffer.putFloat(input.tiltRadians)
                pointsBuffer.putFloat(input.orientationRadians)
            }
            out.write(pointsBuffer.array())

            val brush = stroke.brush
            val stockBrushVal = getStockBrushVal(brush.family)
            val familyBytes = "".toByteArray(Charsets.UTF_8)
            val familyLen = familyBytes.size

            val brushHeader = ByteBuffer.allocate(24).order(ByteOrder.LITTLE_ENDIAN)
            brushHeader.putFloat(brush.size)
            
            val argb = brush.colorIntArgb
            brushHeader.putLong(argb.toLong())
            
            brushHeader.putFloat(brush.epsilon)
            brushHeader.putInt(stockBrushVal)
            brushHeader.putInt(familyLen)
            out.write(brushHeader.array())
            if (familyLen > 0) {
                out.write(familyBytes)
            }
        }
        return out.toByteArray()
    }

    fun deserialize(bytes: ByteArray): List<Stroke> {
        if (bytes.size < 4) return emptyList()
        val buffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
        val numStrokes = buffer.int
        val strokes = mutableListOf<Stroke>()

        for (s in 0 until numStrokes) {
            if (buffer.remaining() < 4) break
            val inputsLen = buffer.int
            if (buffer.remaining() < inputsLen) break
            val n = buffer.int
            val batch = MutableStrokeInputBatch()
            for (p in 0 until n) {
                val x = buffer.float
                val y = buffer.float
                val time = buffer.float
                val pressure = buffer.float
                val tilt = buffer.float
                val orientation = buffer.float
                batch.add(
                    type = InputToolType.STYLUS,
                    x = x,
                    y = y,
                    elapsedTimeMillis = time.toLong(),
                    pressure = pressure,
                    tiltRadians = tilt,
                    orientationRadians = orientation
                )
            }
            val inputs = batch.toImmutable()

            if (buffer.remaining() < 24) break
            val size = buffer.float
            val colorLong = buffer.long
            val epsilon = buffer.float
            val stockVal = buffer.int
            val familyLen = buffer.int
            if (buffer.remaining() < familyLen) break
            
            val familyBytes = ByteArray(familyLen)
            buffer.get(familyBytes)
            val familyId = String(familyBytes, Charsets.UTF_8)

            val family = getBrushFamily(stockVal)
            val colorInt = colorLong.toInt()
            val brush = Brush.createWithColorIntArgb(
                family = family,
                colorIntArgb = colorInt,
                size = size,
                epsilon = epsilon
            )
            strokes.add(Stroke(brush = brush, inputs = inputs))
        }
        return strokes
    }

    private fun getStockBrushVal(family: androidx.ink.brush.BrushFamily): Int {
        val name = family.toString().lowercase()
        return when {
            name.contains("marker") -> 0
            name.contains("pressure") -> 1
            name.contains("highlight") -> 2
            name.contains("dash") -> 3
            else -> 0
        }
    }

    private fun getBrushFamily(stockVal: Int): androidx.ink.brush.BrushFamily {
        return when (stockVal) {
            0 -> StockBrushes.marker()
            1 -> StockBrushes.pressurePen()
            2 -> StockBrushes.highlighter()
            else -> StockBrushes.marker()
        }
    }
}
