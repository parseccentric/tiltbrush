(function (exports) {
'use strict';

const text = (int32) =>
  [0, 8, 16, 24].map(
    d => String.fromCharCode(0xff & (int32 >>> d))
  ).join('')


// https://gist.github.com/Plutor/2002457
// <3 THANKS JAVA <3



const values = Array.from({length: 32}, (_,x) => Math.pow(2, x))

const bits = i =>
  values.map( d => !! (i & d) )

const range = n =>
  Array.from({length: n}, (_, i) => i)


class Reader {

  constructor (view, endian) {
    this.view = view
    this.i = 0
    this.endian = endian
  }

  skip (i) {
    this.i += i
  }

  getInt8() {
    const value = this.view.getInt8(this.i, this.endian)
    this.i += 1
    return value
  }

  getUint8() {
    const value = this.view.getUint8(this.i, this.endian)
    this.i += 1
    return value
  }

  getInt16() {
    const value = this.view.getInt16(this.i, this.endian)
    this.i += 2
    return value
  }

  getUint16() {
    const value = this.view.getUint16(this.i, this.endian)
    this.i += 2
    return value
  }

  getInt32() {
    const value = this.view.getInt32(this.i, this.endian)
    this.i += 4
    return value
  }

  getUint32() {
    const value = this.view.getUint32(this.i, this.endian)
    this.i += 4
    return value
  }

  getFloat32() {
    const value = this.view.getFloat32(this.i, this.endian)
    this.i += 4
    return value
  }

  getFloat64() {
    const value = this.view.getFloat64(this.i, this.endian)
    this.i += 8
    return value
  }

}

class Sketch {

  constructor() {
    console.log("whoop!")

  }

  load(path) {
    this.loaded = fetch(path)
      .then(res => res.arrayBuffer())
      .then(this.decode.bind(this))
  }

  decode(buffer) {

    const view = new DataView(buffer, 0)
    const reader = new Reader(view, true)

    this.header = {
      sentinel:       text(reader.getUint32()),
      header_size:    reader.getUint16(),
      header_version: reader.getUint16(),
      reserved_1:     reader.getUint32(),
      reserved_2:     reader.getUint32()
    }

    this.zip = new JSZip()

    return this.zip.loadAsync(buffer.slice(16))

  }

  thumbnail() {
    return this.loaded
      .then( () => this.zip.file('thumbnail.png').async('base64') )
      .then( b => 'data:image/png;base64,' + b )
  }

  data() {

    const _data = {}

    return this.loaded
      .then( _ =>
        this.zip.file('data.sketch').async('arraybuffer')
      )
      .then( buffer => {
        const view = new DataView(buffer, 0)
        const reader = new Reader(view, true)

        _data.sentinel = reader.getUint32()
        _data.version  = reader.getUint32()
        _data.reserved = reader.getUint32()

        // skip any additional information
        const size = reader.getUint32()
        reader.skip(size)

        const stroke_count = reader.getUint32()

        _data.strokes = range(stroke_count)
          .map(i => {
            const _stroke = {}

            _stroke.brush_index = reader.getInt32()
            _stroke.brush_color = reader.getFloat32()
            _stroke.brush_color = reader.getFloat32()
            _stroke.brush_color = reader.getFloat32()
            _stroke.brush_color = reader.getFloat32()
            _stroke.brush_size  = reader.getFloat32()


            const stroke_ext = reader.getUint32()
            const ctrlpt_ext = reader.getUint32()

            bits(stroke_ext & 0xffff)
              .forEach(b => { if(b) reader.skip(4) })

            bits(stroke_ext & ~0xffff)
              .forEach(b => { if(b) reader.skip(reader.getUint32()) })


            const num_points = reader.getUint32()

            const skipCount = bits(ctrlpt_ext).reduce((a, b) => a + b, 0) * 4

            _stroke.points = range(num_points)
              .map(j => {

                const position = [
                  reader.getFloat32(),
                  reader.getFloat32(),
                  reader.getFloat32()
                ]

                const orientation = [
                  reader.getFloat32(),
                  reader.getFloat32(),
                  reader.getFloat32(),
                  reader.getFloat32()
                ]

                // this is useful information (pressure & timestamp)
                reader.skip(skipCount)

                return { position, orientation }

              })


            return _stroke

          })

        return _data

      })
  }

}

exports.Sketch = Sketch;

}((this.tiltbrush = this.tiltbrush || {})));
