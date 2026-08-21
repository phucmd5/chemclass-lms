-- ==============================================================================
-- DATABASE SCHEMA: ChemClass LMS (Serverless PostgreSQL on Supabase)
-- ==============================================================================

-- 1. Bảng PROFILES: Lưu thông tin người dùng (Giáo viên / Học sinh)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
    phone TEXT,
    student_code TEXT UNIQUE, -- Mã học sinh ví dụ: HS001 (chỉ dành cho student)
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng CLASSES: Lớp học
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Tên lớp ví dụ: "Hoá 12 - Luyện Thi Đại Học"
    grade TEXT NOT NULL, -- Khối lớp: "10", "11", "12"
    description TEXT,
    meet_link TEXT, -- Link Google Meet cố định của lớp
    monthly_fee NUMERIC(12, 2) DEFAULT 0, -- Học phí mặc định/tháng (VNĐ)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bảng CLASS_MEMBERS: Danh sách học sinh trong lớp
CREATE TABLE IF NOT EXISTS class_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'left')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, student_id)
);

-- 4. Bảng SCHEDULES: Lịch học / Thời khóa biểu
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    title TEXT NOT NULL, -- Tên bài học
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    custom_meet_link TEXT, -- Link Meet riêng của buổi (nếu khác link lớp)
    note TEXT, -- Dặn dò bài tập
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Bảng TUITION_INVOICES: Hoá đơn học phí & Quản lý thu qua VietQR
CREATE TABLE IF NOT EXISTS tuition_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_code TEXT UNIQUE NOT NULL, -- Cú pháp chuyển khoản: HP-HS01-T10
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    billing_month TEXT NOT NULL, -- VD: "10/2026"
    amount NUMERIC(12, 2) NOT NULL, -- Số tiền cần nộp
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    paid_at TIMESTAMPTZ, -- Thời điểm xác nhận thanh toán
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Bảng EXAMS: Đề kiểm tra
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 45,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    total_points NUMERIC(5, 2) DEFAULT 10.0,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Bảng QUESTIONS: Câu hỏi trong đề (Hỗ trợ công thức Hoá học LaTeX)
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'short_answer')),
    content_latex TEXT NOT NULL, -- Đề bài có định dạng KaTeX: \ce{Fe + 2HCl -> FeCl2 + H2 ^}
    options_json JSONB, -- Mảng 4 đáp án dạng: [{"key": "A", "text": "FeCl2"}, ...]
    correct_answer TEXT NOT NULL, -- "A" hoặc chuỗi đáp án tự luận
    explanation TEXT, -- Lời giải chi tiết
    points NUMERIC(5, 2) DEFAULT 1.0,
    order_index INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Bảng EXAM_SUBMISSIONS: Bài nộp của học sinh + Log giám sát chuyển tab
CREATE TABLE IF NOT EXISTS exam_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    score NUMERIC(5, 2) DEFAULT 0,
    answers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    tab_switch_count INT NOT NULL DEFAULT 0, -- Số lần học sinh rời tab
    blur_events_log JSONB DEFAULT '[]'::jsonb, -- Chi tiết mốc thời gian rời tab
    started_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    UNIQUE(exam_id, student_id)
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tuition_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_submissions ENABLE ROW LEVEL SECURITY;

-- Cho phép đọc profile công khai trong hệ thống
CREATE POLICY "Cho phép đọc profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Cho phép user cập nhật profile của mình" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Chính sách cho Lớp học & Thời khóa biểu
CREATE POLICY "Giáo viên toàn quyền với lớp của mình" ON classes FOR ALL USING (auth.uid() = teacher_id);
CREATE POLICY "Học sinh xem lớp mình tham gia" ON classes FOR SELECT USING (
    EXISTS (SELECT 1 FROM class_members WHERE class_members.class_id = classes.id AND class_members.student_id = auth.uid())
);

CREATE POLICY "Xem lịch học" ON schedules FOR SELECT USING (true);
CREATE POLICY "Giáo viên tạo và sửa lịch học" ON schedules FOR ALL USING (
    EXISTS (SELECT 1 FROM classes WHERE classes.id = schedules.class_id AND classes.teacher_id = auth.uid())
);

-- Chính sách cho Học phí
CREATE POLICY "Học sinh xem hoá đơn của mình" ON tuition_invoices FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Giáo viên quản lý hoá đơn lớp của mình" ON tuition_invoices FOR ALL USING (
    EXISTS (SELECT 1 FROM classes WHERE classes.id = tuition_invoices.class_id AND classes.teacher_id = auth.uid())
);

-- Chính sách cho Đề thi & Bài làm
CREATE POLICY "Xem đề thi đã xuất bản" ON exams FOR SELECT USING (is_published = true OR teacher_id = auth.uid());
CREATE POLICY "Giáo viên quản lý đề thi" ON exams FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Xem câu hỏi đề thi" ON questions FOR SELECT USING (true);
CREATE POLICY "Giáo viên quản lý câu hỏi" ON questions FOR ALL USING (
    EXISTS (SELECT 1 FROM exams WHERE exams.id = questions.exam_id AND exams.teacher_id = auth.uid())
);

CREATE POLICY "Học sinh xem và nộp bài làm của mình" ON exam_submissions FOR ALL USING (student_id = auth.uid());
CREATE POLICY "Giáo viên xem bài làm của học sinh" ON exam_submissions FOR SELECT USING (
    EXISTS (SELECT 1 FROM exams WHERE exams.id = exam_submissions.exam_id AND exams.teacher_id = auth.uid())
);
