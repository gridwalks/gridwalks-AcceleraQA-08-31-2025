import { exportNotebook } from './exportUtils';

describe('exportNotebook CSV export', () => {
  it('escapes quotes in messages', async () => {
    const messages = [{
      timestamp: new Date().toISOString(),
      type: 'user',
      content: 'He said, "Hello"',
      resources: [],
      isStudyNotes: false
    }];

    class MockBlob {
      constructor(parts) {
        this.parts = parts;
      }
      text() {
        return Promise.resolve(this.parts.join(''));
      }
    }
    global.Blob = MockBlob;

    let capturedBlob;
    const createObjectURL = jest.fn(blob => {
      capturedBlob = blob;
      return 'blob:mock';
    });
    const revokeObjectURL = jest.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;

    exportNotebook(messages);

    const text = await capturedBlob.text();
    expect(createObjectURL).toHaveBeenCalled();
    const expected = [
      '"Timestamp","Type","Message","Resources","Study Notes"',
      `"${messages[0].timestamp}","user","He said; ""Hello""","","No"`
    ].join('\n');
    expect(text).toBe(expected);
  });
});
