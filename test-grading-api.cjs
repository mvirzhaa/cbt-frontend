const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

async function testGradingAPI() {
    console.log('🧪 Testing Grading API Endpoints\n');

    try {
        // 1. Login sebagai dosen
        console.log('1️⃣ Login sebagai dosen...');
        const loginRes = await axios.post(`${API_BASE_URL}/api/login`, {
            email: 'dosen@cbt.com',
            password: 'rahasia123'
        });

        const token = loginRes.data.token;
        console.log('✅ Login berhasil! Token:', token.substring(0, 20) + '...\n');

        const headers = { Authorization: `Bearer ${token}` };

        // 2. Ambil daftar ujian
        console.log('2️⃣ Mengambil daftar ujian...');
        const examsRes = await axios.get(`${API_BASE_URL}/api/exams`, { headers });
        const exams = examsRes.data.data || [];
        console.log(`✅ Ditemukan ${exams.length} ujian`);

        if (exams.length === 0) {
            console.log('⚠️  Tidak ada ujian untuk testing. Silakan buat ujian terlebih dahulu.');
            return;
        }

        const examId = exams[0].id;
        console.log(`📋 Menggunakan ujian: ${exams[0].nama_ujian} (ID: ${examId})\n`);

        // 3. Test endpoint getAllAnswers (BARU)
        console.log('3️⃣ Testing endpoint GET /api/grading/exams/:exam_id/all-answers...');
        try {
            const allAnswersRes = await axios.get(
                `${API_BASE_URL}/api/grading/exams/${examId}/all-answers`,
                { headers }
            );
            const allAnswers = allAnswersRes.data.data || [];
            console.log(`✅ Endpoint baru berhasil! Ditemukan ${allAnswers.length} jawaban total`);

            if (allAnswers.length > 0) {
                console.log(`   Sample data:`, {
                    id: allAnswers[0].id,
                    user: allAnswers[0].users?.nama,
                    tipe_soal: allAnswers[0].questions?.tipe_soal,
                    has_kunci_jawaban: !!allAnswers[0].questions?.kunci_jawaban,
                    has_opsi_jawaban: !!allAnswers[0].questions?.opsi_jawaban
                });
            }
        } catch (error) {
            console.log('❌ Endpoint getAllAnswers error:', error.response?.data || error.message);
        }

        console.log();

        // 4. Test endpoint getStudentAnswers (BARU)
        console.log('4️⃣ Testing endpoint GET /api/grading/exams/:exam_id/students/:student_id/answers...');
        try {
            // Ambil student_id dari jawaban pertama
            const allAnswersRes = await axios.get(
                `${API_BASE_URL}/api/grading/exams/${examId}/all-answers`,
                { headers }
            );
            const allAnswers = allAnswersRes.data.data || [];

            if (allAnswers.length > 0) {
                const studentId = allAnswers[0].user_id;
                const studentAnswersRes = await axios.get(
                    `${API_BASE_URL}/api/grading/exams/${examId}/students/${studentId}/answers`,
                    { headers }
                );
                const studentAnswers = studentAnswersRes.data.data || [];
                console.log(`✅ Endpoint baru berhasil! Ditemukan ${studentAnswers.length} jawaban untuk mahasiswa ${allAnswers[0].users?.nama}`);

                if (studentAnswers.length > 0) {
                    console.log(`   Tipe soal: ${studentAnswers.map(a => a.questions?.tipe_soal).join(', ')}`);
                }
            } else {
                console.log('⚠️  Tidak ada jawaban untuk testing endpoint student');
            }
        } catch (error) {
            console.log('❌ Endpoint getStudentAnswers error:', error.response?.data || error.message);
        }

        console.log();

        // 5. Test endpoint lama (untuk perbandingan)
        console.log('5️⃣ Testing endpoint lama GET /api/grading/exams/:exam_id/answers...');
        try {
            const oldAnswersRes = await axios.get(
                `${API_BASE_URL}/api/grading/exams/${examId}/answers`,
                { headers }
            );
            const oldAnswers = oldAnswersRes.data.data || [];
            console.log(`✅ Endpoint lama: ${oldAnswers.length} jawaban (hanya status: menunggu)`);
        } catch (error) {
            console.log('❌ Endpoint lama error:', error.response?.data || error.message);
        }

        console.log('\n✅ Testing selesai!');

    } catch (error) {
        console.error('\n❌ Error during testing:', error.response?.data || error.message);
    }
}

testGradingAPI();
